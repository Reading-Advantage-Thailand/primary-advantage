"use client";

/**
 * TasksTab — Tab 2 of the AI Config admin page.
 *
 * Desktop/tablet: Table with per-row edit action.
 * Mobile (<768 px): Stacked cards, tap to expand + edit.
 *
 * Responsive: mobile-first (unprefixed = mobile baseline, md: = tablet+).
 */

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, RefreshCw, AlertCircle, Info } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KindBadge } from "./kind-badge";
import { CapabilityBadge } from "./capability-badge";
import { RelativeTime } from "./relative-time";
import { TaskEditDialog } from "./task-edit-dialog";
import { useTasks, useProviders, useRevalidateCache } from "./use-ai-config";
import { taskLabel } from "./task-labels";
import type { AiTaskConfig } from "./types";

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

const STRINGS = {
  columns: {
    taskKey: "Task Key",
    provider: "Provider",
    model: "Model",
    temperature: "Temp",
    updated: "Last Updated",
    updatedBy: "Updated By",
    actions: "Actions",
  },
  refreshButton: "Refresh provider cache",
  refreshTooltip:
    "Changes apply automatically within 5 minutes. Click to apply immediately.",
  refreshing: "Refreshing...",
  empty: "No task configurations found.",
  emptySub: "Re-run the database seed to restore default task assignments.",
  loadError: "Failed to load task configurations.",
  retry: "Retry",
  noValue: "—",
  toast: {
    refreshSuccess: "Cache refreshed",
    refreshError: "Failed to refresh cache",
    editSuccess: "Task updated",
  },
} as const;

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TaskSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
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

function TaskCard({
  task,
  onEdit,
  isHighlighted,
}: {
  task: AiTaskConfig;
  onEdit: () => void;
  isHighlighted: boolean;
}) {
  return (
    <Card
      className={`w-full transition-colors ${
        isHighlighted ? "ring-2 ring-orange-400 dark:ring-orange-600" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold">{taskLabel(task.taskKey)}</span>
              <CapabilityBadge capability={task.capability} />
            </div>
            <span className="font-mono text-xs text-muted-foreground">{task.taskKey}</span>
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">{task.providerName}</span>
              <KindBadge kind={task.providerKind} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">{task.modelId}</p>
            {task.temperature !== null && (
              <span className="text-xs text-muted-foreground">Temp: {task.temperature}</span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onEdit} aria-label={`Edit ${task.taskKey}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <RelativeTime dateString={task.updatedAt} />
          {task.updatedByName && (
            <span className="ml-2">by {task.updatedByName}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TasksTabProps {
  highlightTaskKeys?: string[];
}

export function TasksTab({ highlightTaskKeys = [] }: TasksTabProps) {
  const { data: tasks, isLoading: tasksLoading, isError, refetch } = useTasks();
  const { data: providers = [], isLoading: providersLoading } = useProviders();
  const revalidateMutation = useRevalidateCache();

  const [editingTask, setEditingTask] = useState<AiTaskConfig | undefined>();

  const isLoading = tasksLoading || providersLoading;

  async function handleRevalidate() {
    try {
      await revalidateMutation.mutateAsync();
      toast.success(STRINGS.toast.refreshSuccess);
    } catch (err) {
      toast.error(STRINGS.toast.refreshError, {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevalidate}
                  disabled={revalidateMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw
                    className={`mr-2 h-3.5 w-3.5 ${revalidateMutation.isPending ? "animate-spin" : ""}`}
                  />
                  {revalidateMutation.isPending
                    ? STRINGS.refreshing
                    : STRINGS.refreshButton}
                </Button>
                <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px]">
              <p className="text-xs">{STRINGS.refreshTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Error */}
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

      {/* Empty */}
      {!isLoading && !isError && tasks?.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{STRINGS.empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">{STRINGS.emptySub}</p>
        </div>
      )}

      {/* Desktop/tablet table */}
      {(isLoading || (tasks && tasks.length > 0)) && (
        <div className="hidden md:block">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{STRINGS.columns.taskKey}</TableHead>
                  <TableHead>{STRINGS.columns.provider}</TableHead>
                  <TableHead>{STRINGS.columns.model}</TableHead>
                  <TableHead>{STRINGS.columns.temperature}</TableHead>
                  <TableHead>{STRINGS.columns.updated}</TableHead>
                  <TableHead>{STRINGS.columns.updatedBy}</TableHead>
                  <TableHead className="w-[80px]">{STRINGS.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TaskSkeletonRows />
                ) : (
                  tasks?.map((task) => {
                    const isHighlighted = highlightTaskKeys.includes(task.taskKey);
                    return (
                      <TableRow
                        key={task.taskKey}
                        className={isHighlighted ? "bg-orange-50 dark:bg-orange-950/20" : ""}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium">{taskLabel(task.taskKey)}</span>
                              <CapabilityBadge capability={task.capability} />
                            </div>
                            <span className="font-mono text-xs text-muted-foreground">{task.taskKey}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm">{task.providerName}</span>
                            <KindBadge kind={task.providerKind} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {task.modelId}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm">
                          {task.temperature !== null
                            ? task.temperature
                            : <span className="text-muted-foreground">{STRINGS.noValue}</span>}
                        </TableCell>
                        <TableCell>
                          <RelativeTime dateString={task.updatedAt} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.updatedByName ?? STRINGS.noValue}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTask(task)}
                            aria-label={`Edit ${task.taskKey}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Mobile card stack */}
      {!isLoading && tasks && tasks.length > 0 && (
        <div className="flex flex-col gap-3 md:hidden">
          {tasks.map((task) => (
            <TaskCard
              key={task.taskKey}
              task={task}
              onEdit={() => setEditingTask(task)}
              isHighlighted={highlightTaskKeys.includes(task.taskKey)}
            />
          ))}
        </div>
      )}

      {/* Mobile skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-3 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-4 w-48" />
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editingTask && (
        <TaskEditDialog
          open={!!editingTask}
          onOpenChange={(open) => {
            if (!open) setEditingTask(undefined);
          }}
          task={editingTask}
          providers={providers}
        />
      )}
    </div>
  );
}
