"use client";

/**
 * TaskEditDialog — inline edit form for a single AiTaskConfig row.
 *
 * Provider dropdown filters by capability:
 *   IMAGE  → VERTEX only
 *   TEXT / STREAMING → all enabled providers
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { KindBadge } from "./kind-badge";
import { useUpdateTask } from "./use-ai-config";
import type { AiProvider, AiTaskConfig } from "./types";

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

const STRINGS = {
  title: (key: string) => `Edit Task: ${key}`,
  description: "Update the provider and model settings for this task.",
  fields: {
    provider: "Provider",
    providerDescription: "IMAGE tasks are restricted to VERTEX providers.",
    model: "Model ID",
    modelDescription: "Enter the model identifier from your provider's documentation.",
    temperature: "Temperature",
    temperatureDescription: "Value between 0 and 2. Leave blank to use the provider default.",
  },
  actions: {
    cancel: "Cancel",
    save: "Save Changes",
    saving: "Saving...",
  },
  errors: {
    saveFailed: "Failed to update task",
  },
  success: {
    updated: "Task updated successfully",
  },
  modelSuggestions: {
    VERTEX: ["gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.1-flash-lite-preview", "gemini-2.5-flash-image", "gemini-3-flash-preview-image"],
    OPENAI: ["gpt-4o", "gpt-4o-mini", "gpt-5.1", "gpt-5.2"],
    OPENAI_COMPATIBLE: [],
  },
} as const;

// ---------------------------------------------------------------------------
// Form value types
// ---------------------------------------------------------------------------

type FormValues = {
  providerId: string;
  modelId: string;
  temperature: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: AiTaskConfig;
  providers: AiProvider[];
}

export function TaskEditDialog({
  open,
  onOpenChange,
  task,
  providers,
}: TaskEditDialogProps) {
  const mutation = useUpdateTask(task.taskKey);

  // Filter providers by capability constraint
  const eligibleProviders = providers.filter((p) => {
    if (!p.enabled) return false;
    if (task.capability === "IMAGE") return p.kind === "VERTEX";
    return true;
  });

  const form = useForm<FormValues>({
    defaultValues: {
      providerId: task.providerId,
      modelId: task.modelId,
      temperature: task.temperature !== null ? String(task.temperature) : "",
    },
  });

  // Update model suggestions when provider changes
  const watchedProviderId = form.watch("providerId");
  const watchedProviderKind = providers.find((p) => p.id === watchedProviderId)?.kind;
  const modelSuggestions =
    STRINGS.modelSuggestions[watchedProviderKind as keyof typeof STRINGS.modelSuggestions] ?? [];

  useEffect(() => {
    if (open) {
      form.reset({
        providerId: task.providerId,
        modelId: task.modelId,
        temperature: task.temperature !== null ? String(task.temperature) : "",
      });
    }
  }, [open, task, form]);

  async function onSubmit(values: FormValues) {
    const tempVal = values.temperature.trim();

    const input = {
      ...(values.providerId !== task.providerId ? { providerId: values.providerId } : {}),
      ...(values.modelId !== task.modelId ? { modelId: values.modelId } : {}),
      temperature: tempVal === "" ? null : parseFloat(tempVal),
    };

    // If nothing changed, still allow submit to re-set temperature/maxTokens to null
    try {
      await mutation.mutateAsync(input);
      toast.success(STRINGS.success.updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(STRINGS.errors.saveFailed, {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const datalistId = `model-suggestions-${task.taskKey}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{STRINGS.title(task.taskKey)}</DialogTitle>
          <DialogDescription>{STRINGS.description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Provider */}
            <FormField
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{STRINGS.fields.provider} *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={mutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eligibleProviders.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            {p.name}
                            <KindBadge kind={p.kind} />
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {task.capability === "IMAGE" && (
                    <FormDescription>{STRINGS.fields.providerDescription}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Model ID with datalist suggestions */}
            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{STRINGS.fields.model} *</FormLabel>
                  <FormControl>
                    <Input
                      list={datalistId}
                      placeholder="e.g. gemini-3.5-flash"
                      {...field}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <datalist id={datalistId}>
                    {modelSuggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <FormDescription>{STRINGS.fields.modelDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Temperature */}
            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{STRINGS.fields.temperature}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      placeholder="e.g. 0.7 (blank = provider default)"
                      {...field}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>{STRINGS.fields.temperatureDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer actions */}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                {STRINGS.actions.cancel}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mutation.isPending ? STRINGS.actions.saving : STRINGS.actions.save}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
