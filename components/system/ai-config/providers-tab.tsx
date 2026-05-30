"use client";

/**
 * ProvidersTab — Tab 1 of the AI Config admin page.
 *
 * Desktop/tablet: Table with inline enabled-toggle.
 * Mobile (<768 px): Stacked cards, expand to see full details.
 *
 * Responsive: mobile-first (unprefixed = mobile baseline, md: = tablet+, lg: = desktop).
 */

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Lock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { KindBadge } from "./kind-badge";
import { RelativeTime } from "./relative-time";
import { ProviderFormDialog } from "./provider-form-dialog";
import { useProviders } from "./use-ai-config";
import { isDefaultProvider } from "./types";
import type { AiProvider } from "./types";

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

const STRINGS = {
  title: "AI Providers",
  newButton: "New Provider",
  columns: {
    name: "Name",
    kind: "Kind",
    baseUrl: "Base URL",
    apiKeyRef: "API Key Ref",
    enabled: "Enabled",
    updated: "Last Updated",
    actions: "Actions",
  },
  empty: "No providers configured yet.",
  emptyAction: "Add your first provider to get started.",
  loadError: "Failed to load providers.",
  retry: "Retry",
  noUrl: "—",
  noKey: "—",
  actions: {
    edit: "Edit",
    disable: "Disable",
    enable: "Enable",
    delete: "Delete provider",
  },
  defaults: {
    badge: "Default",
    lockTooltip: "Default provider — managed via environment configuration. Cannot be edited.",
    toggleTooltip: "Default providers are always enabled.",
  },
  deleteDialog: {
    title: "Delete provider?",
    description: (name: string) =>
      `This permanently deletes "${name}" and removes its stored API key from Secret Manager. This action cannot be undone.`,
    cancel: "Cancel",
    confirm: "Delete",
    dependentTitle: "Cannot Disable Provider",
    dependentDescription: (keys: string[]) =>
      `This provider is still referenced by ${keys.length} task(s): ${keys.join(", ")}. Reassign these tasks in the Task Assignments tab before disabling.`,
    reassign: "Go to Task Assignments",
    close: "Close",
  },
  toast: {
    enabledSuccess: (name: string) => `${name} enabled`,
    disabledSuccess: (name: string) => `${name} disabled`,
    toggleError: "Failed to update provider",
    deleteSuccess: "Provider deleted",
    deleteError: "Failed to delete provider",
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateUrl(url: string, maxLen = 40): string {
  return url.length > maxLen ? url.slice(0, maxLen) + "…" : url;
}

/** Sort order: VERTEX first, OPENAI second, OPENAI_COMPATIBLE last (by name). */
const KIND_RANK: Record<string, number> = { VERTEX: 0, OPENAI: 1, OPENAI_COMPATIBLE: 2 };

function sortProviders(providers: AiProvider[]): AiProvider[] {
  return [...providers].sort(
    (a, b) =>
      (KIND_RANK[a.kind] ?? 3) - (KIND_RANK[b.kind] ?? 3) ||
      a.name.localeCompare(b.name),
  );
}

// ---------------------------------------------------------------------------
// Table skeleton rows
// ---------------------------------------------------------------------------

function ProviderSkeletonRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Mobile card
// ---------------------------------------------------------------------------

function ProviderCard({
  provider,
  onEdit,
  onToggleEnabled,
  onDelete,
  isToggling,
}: {
  provider: AiProvider;
  onEdit: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onDelete: () => void;
  isToggling: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDefault = isDefaultProvider(provider);

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {/* Row 1: name + kind + toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-semibold">{provider.name}</span>
              {isDefault && (
                <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {STRINGS.defaults.badge}
                </span>
              )}
            </div>
            <KindBadge kind={provider.kind} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isDefault ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Switch
                        checked={true}
                        disabled
                        aria-label={`${provider.name} is always enabled`}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{STRINGS.defaults.toggleTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Switch
                checked={provider.enabled}
                onCheckedChange={onToggleEnabled}
                disabled={isToggling}
                aria-label={`Toggle ${provider.name}`}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-2 border-t pt-3 text-sm">
            {provider.baseUrl && (
              <div>
                <span className="text-muted-foreground">Base URL: </span>
                <span className="break-all font-mono text-xs">{provider.baseUrl}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">API Key: </span>
              {provider.apiKeyRef ? (
                <code className="rounded bg-muted px-1 text-xs">{provider.apiKeyRef}</code>
              ) : (
                <span className="text-muted-foreground">{STRINGS.noKey}</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Updated: </span>
              <RelativeTime dateString={provider.updatedAt} />
            </div>
            <div className="flex gap-2 pt-1">
              {isDefault ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        {STRINGS.defaults.badge}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[220px] text-xs">{STRINGS.defaults.lockTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={onEdit}>
                    <Pencil className="mr-1 h-3 w-3" />
                    {STRINGS.actions.edit}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {STRINGS.actions.disable}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ProvidersTabProps {
  onNavigateToTasks: (highlightKeys?: string[]) => void;
}

export function ProvidersTab({ onNavigateToTasks }: ProvidersTabProps) {
  const { data: providers, isLoading, isError, refetch } = useProviders();

  // Derived sorted list — defaults (VERTEX, OPENAI) first, then OPENAI_COMPATIBLE by name.
  // Created fresh each render; does not mutate the React Query cache.
  const sorted = sortProviders(providers ?? []);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<AiProvider | undefined>();
  const [dependentKeys, setDependentKeys] = useState<string[]>([]);
  const [dependentDialogOpen, setDependentDialogOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // We create update mutations per-provider; but to be compatible with hooks rules,
  // we use a single inline approach via a helper.
  const handleToggleEnabled = async (provider: AiProvider, enabled: boolean) => {
    setTogglingId(provider.id);
    // Optimistic approach: we call the API and on error show toast
    try {
      const res = await fetch(`/api/system/ai-config/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success(
        enabled
          ? STRINGS.toast.enabledSuccess(provider.name)
          : STRINGS.toast.disabledSuccess(provider.name),
      );
      refetch();
    } catch (err) {
      toast.error(STRINGS.toast.toggleError, {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenEdit = (provider: AiProvider) => {
    setEditingProvider(provider);
    setFormDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingProvider(undefined);
    setFormDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/system/ai-config/providers/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.dependentTaskKeys) {
          setDependentKeys(data.dependentTaskKeys);
          setDeleteTarget(undefined);
          setDependentDialogOpen(true);
          return;
        }
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      toast.success(STRINGS.toast.deleteSuccess);
      refetch();
    } catch (err) {
      toast.error(STRINGS.toast.deleteError, {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setDeleteTarget(undefined);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {STRINGS.newButton}
        </Button>
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium">{STRINGS.loadError}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-3 w-3" />
            {STRINGS.retry}
          </Button>
        </div>
      )}

      {/* Empty state (not loading, no error, no data) */}
      {!isLoading && !isError && sorted.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{STRINGS.empty}</p>
          <p className="text-sm text-muted-foreground">{STRINGS.emptyAction}</p>
          <Button onClick={handleOpenCreate} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            {STRINGS.newButton}
          </Button>
        </div>
      )}

      {/* Desktop/tablet table — hidden on mobile */}
      {(isLoading || sorted.length > 0) && (
        <div className="hidden md:block">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{STRINGS.columns.name}</TableHead>
                  <TableHead>{STRINGS.columns.kind}</TableHead>
                  <TableHead>{STRINGS.columns.baseUrl}</TableHead>
                  <TableHead>{STRINGS.columns.apiKeyRef}</TableHead>
                  <TableHead>{STRINGS.columns.enabled}</TableHead>
                  <TableHead>{STRINGS.columns.updated}</TableHead>
                  <TableHead className="w-[100px]">{STRINGS.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <ProviderSkeletonRows />
                ) : (
                  sorted.map((provider) => {
                    const isDefault = isDefaultProvider(provider);
                    return (
                      <TableRow key={provider.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {provider.name}
                            {isDefault && (
                              <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {STRINGS.defaults.badge}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <KindBadge kind={provider.kind} />
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {provider.baseUrl ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-default font-mono text-xs underline-offset-2 hover:underline">
                                    {truncateUrl(provider.baseUrl)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-[300px] break-all text-xs">{provider.baseUrl}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">{STRINGS.noUrl}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {provider.apiKeyRef ? (
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {provider.apiKeyRef}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">{STRINGS.noKey}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isDefault ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Switch
                                      checked={true}
                                      disabled
                                      aria-label={`${provider.name} is always enabled`}
                                    />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{STRINGS.defaults.toggleTooltip}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Switch
                              checked={provider.enabled}
                              onCheckedChange={(enabled) =>
                                handleToggleEnabled(provider, enabled)
                              }
                              disabled={togglingId === provider.id}
                              aria-label={`Toggle ${provider.name}`}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <RelativeTime dateString={provider.updatedAt} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isDefault ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex h-8 w-8 items-center justify-center text-muted-foreground">
                                      <Lock className="h-3.5 w-3.5" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-[220px] text-xs">{STRINGS.defaults.lockTooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(provider)}
                                  aria-label={`Edit ${provider.name}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(provider)}
                                  aria-label={`Disable ${provider.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Mobile card stack — hidden on md+ */}
      {!isLoading && sorted.length > 0 && (
        <div className="flex flex-col gap-3 md:hidden">
          {sorted.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onEdit={() => handleOpenEdit(provider)}
              onToggleEnabled={(enabled) => handleToggleEnabled(provider, enabled)}
              onDelete={() => setDeleteTarget(provider)}
              isToggling={togglingId === provider.id}
            />
          ))}
        </div>
      )}

      {/* Mobile skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-3 md:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-5 w-40" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Provider form dialog (create / edit) */}
      <ProviderFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) {
            setEditingProvider(undefined);
            refetch();
          }
        }}
        provider={editingProvider}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{STRINGS.deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                STRINGS.deleteDialog.description(deleteTarget.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{STRINGS.deleteDialog.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {STRINGS.deleteDialog.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dependent tasks 409 dialog */}
      <AlertDialog
        open={dependentDialogOpen}
        onOpenChange={setDependentDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{STRINGS.deleteDialog.dependentTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {STRINGS.deleteDialog.dependentDescription(dependentKeys)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDependentDialogOpen(false)}>
              {STRINGS.deleteDialog.close}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDependentDialogOpen(false);
                onNavigateToTasks(dependentKeys);
              }}
            >
              {STRINGS.deleteDialog.reassign}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
