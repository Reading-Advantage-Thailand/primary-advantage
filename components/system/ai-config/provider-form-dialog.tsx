"use client";

/**
 * ProviderFormDialog — used for both Create and Edit provider operations.
 *
 * Security note: the apiKey field value is cleared from form state
 * immediately after submit (success or error) to avoid lingering secrets.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Switch } from "@/components/ui/switch";
import { useCreateProvider, useUpdateProvider } from "./use-ai-config";
import type { AiProvider } from "./types";

// ---------------------------------------------------------------------------
// Strings (all English; centralised for future i18n sweep)
// ---------------------------------------------------------------------------

const STRINGS = {
  createTitle: "New Provider",
  createDescription: "Configure a new OpenAI-compatible provider (e.g. OpenRouter, Groq, Together).",
  createKindLabel: "OpenAI-Compatible Provider",
  editTitle: "Edit Provider",
  editDescription: "Update provider settings. Leave API key blank to keep the current key.",
  fields: {
    name: "Provider Name",
    nameDescription: "A unique display name for this provider.",
    namePlaceholder: "e.g. OpenRouter Production",
    baseUrl: "Base URL",
    baseUrlDescription: "The provider's OpenAI-compatible API endpoint.",
    baseUrlPlaceholder: "https://openrouter.ai/api/v1",
    apiKey: "API Key",
    apiKeyPlaceholder: "Enter API key",
    apiKeyPlaceholderEdit: "Leave blank to keep current key",
    apiKeyDescription: "Stored securely in Google Secret Manager. Never returned by the API.",
    enabled: "Enabled",
    enabledDescription: "Disabled providers cannot be assigned to tasks.",
  },
  actions: {
    cancel: "Cancel",
    create: "Create Provider",
    save: "Save Changes",
    creating: "Creating...",
    saving: "Saving...",
  },
  errors: {
    createFailed: "Failed to create provider",
    saveFailed: "Failed to save provider",
  },
  success: {
    created: "Provider created successfully",
    updated: "Provider updated successfully",
  },
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

// Single schema used for both create and edit.
// baseUrl / apiKey are always strings (empty string = not provided).
// Required-field enforcement for create mode is handled in onSubmit via
// form.setError(), keeping the resolver type stable and avoiding a union.
const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  baseUrl: z.string(),
  apiKey: z.string(),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProviderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in Edit mode. */
  provider?: AiProvider;
  /** Query param setter for tab navigation after 409 */
  onNavigateToTasks?: () => void;
}

export function ProviderFormDialog({
  open,
  onOpenChange,
  provider,
}: ProviderFormDialogProps) {
  const isEdit = !!provider;
  const createMutation = useCreateProvider();
  const updateMutation = useUpdateProvider(provider?.id ?? "");
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: provider?.name ?? "",
      baseUrl: provider?.baseUrl ?? "",
      apiKey: "",
      enabled: provider?.enabled ?? true,
    },
  });

  // Reset form when the dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: provider?.name ?? "",
        baseUrl: provider?.baseUrl ?? "",
        apiKey: "",
        enabled: provider?.enabled ?? true,
      });
    }
  }, [open, provider, form]);

  async function onSubmit(values: FormValues) {
    // Create mode: enforce required fields that the shared schema leaves lenient.
    if (!isEdit) {
      let hasError = false;
      if (!values.baseUrl.trim()) {
        form.setError("baseUrl", { message: "Base URL is required" });
        hasError = true;
      }
      if (!values.apiKey.trim()) {
        form.setError("apiKey", { message: "API key is required" });
        hasError = true;
      }
      if (hasError) return;
    }

    try {
      if (isEdit) {
        const patch: Record<string, unknown> = {};
        if (values.name !== provider!.name) patch.name = values.name;
        if (values.baseUrl !== (provider!.baseUrl ?? "")) patch.baseUrl = values.baseUrl || null;
        if (values.apiKey && values.apiKey.trim() !== "") patch.apiKey = values.apiKey;
        if (values.enabled !== provider!.enabled) patch.enabled = values.enabled;
        await updateMutation.mutateAsync(patch);
        toast.success(STRINGS.success.updated);
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          kind: "OPENAI_COMPATIBLE",
          baseUrl: values.baseUrl,
          apiKey: values.apiKey,
          enabled: values.enabled,
        });
        toast.success(STRINGS.success.created);
      }
      // Clear apiKey from form state immediately (security: don't leave secrets in memory)
      form.setValue("apiKey", "");
      onOpenChange(false);
    } catch (err) {
      // Clear apiKey even on error
      form.setValue("apiKey", "");
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(isEdit ? STRINGS.errors.saveFailed : STRINGS.errors.createFailed, {
        description: message,
      });
      // Surface server-side name uniqueness error inline
      if (message.includes("already exists")) {
        form.setError("name", { message });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? STRINGS.editTitle : STRINGS.createTitle}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? STRINGS.editDescription : STRINGS.createDescription}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* In create mode, show a static kind label (only OPENAI_COMPATIBLE allowed) */}
            {!isEdit && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium text-muted-foreground">
                {STRINGS.createKindLabel}
              </div>
            )}

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{STRINGS.fields.name} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={STRINGS.fields.namePlaceholder}
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>{STRINGS.fields.nameDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Base URL */}
            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{STRINGS.fields.baseUrl} *</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder={STRINGS.fields.baseUrlPlaceholder}
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>{STRINGS.fields.baseUrlDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* API Key */}
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {STRINGS.fields.apiKey}{!isEdit && " *"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder={
                        isEdit
                          ? STRINGS.fields.apiKeyPlaceholderEdit
                          : STRINGS.fields.apiKeyPlaceholder
                      }
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>{STRINGS.fields.apiKeyDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Enabled toggle */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{STRINGS.fields.enabled}</FormLabel>
                    <FormDescription>{STRINGS.fields.enabledDescription}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                      aria-label="Enable provider"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Footer actions */}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {STRINGS.actions.cancel}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit
                  ? isPending
                    ? STRINGS.actions.saving
                    : STRINGS.actions.save
                  : isPending
                    ? STRINGS.actions.creating
                    : STRINGS.actions.create}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
