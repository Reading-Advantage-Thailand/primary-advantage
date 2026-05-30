"use client";

/**
 * React Query hooks for the AI Config Admin UI.
 * All keys are namespaced under ["ai-config", ...] to make invalidation
 * surgical and predictable.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AiProvider, AiTaskConfig } from "./types";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const AI_CONFIG_KEYS = {
  providers: ["ai-config", "providers"] as const,
  tasks: ["ai-config", "tasks"] as const,
};

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

async function fetchProviders(): Promise<AiProvider[]> {
  const res = await fetch("/api/system/ai-config/providers");
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  // API returns a bare array (confirmed from controller: NextResponse.json(rows.map(...)))
  return res.json();
}

export function useProviders() {
  return useQuery({
    queryKey: AI_CONFIG_KEYS.providers,
    queryFn: fetchProviders,
  });
}

export interface CreateProviderInput {
  name: string;
  kind: "VERTEX" | "OPENAI" | "OPENAI_COMPATIBLE";
  baseUrl?: string;
  apiKey?: string;
  enabled?: boolean;
}

export interface UpdateProviderInput {
  name?: string;
  baseUrl?: string | null;
  apiKey?: string;
  enabled?: boolean;
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProviderInput): Promise<AiProvider> => {
      const res = await fetch("/api/system/ai-config/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIG_KEYS.providers });
    },
  });
}

export function useUpdateProvider(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProviderInput): Promise<AiProvider> => {
      const res = await fetch(`/api/system/ai-config/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIG_KEYS.providers });
    },
  });
}

export interface DeleteProviderResult {
  dependentTaskKeys?: string[];
}

export function useDeleteProvider(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ status: number; data: AiProvider & { dependentTaskKeys?: string[] } }> => {
      const res = await fetch(`/api/system/ai-config/providers/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.error ?? `HTTP ${res.status}`) as Error & { status: number; dependentTaskKeys?: string[] };
        err.status = res.status;
        err.dependentTaskKeys = data.dependentTaskKeys;
        throw err;
      }
      return { status: res.status, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIG_KEYS.providers });
    },
  });
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

async function fetchTasks(): Promise<AiTaskConfig[]> {
  const res = await fetch("/api/system/ai-config/tasks");
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useTasks() {
  return useQuery({
    queryKey: AI_CONFIG_KEYS.tasks,
    queryFn: fetchTasks,
  });
}

export interface UpdateTaskInput {
  providerId?: string;
  modelId?: string;
  temperature?: number | null;
}

export function useUpdateTask(taskKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTaskInput): Promise<AiTaskConfig> => {
      const res = await fetch(
        `/api/system/ai-config/tasks/${encodeURIComponent(taskKey)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIG_KEYS.tasks });
    },
  });
}

// ---------------------------------------------------------------------------
// Revalidate
// ---------------------------------------------------------------------------

export function useRevalidateCache() {
  return useMutation({
    mutationFn: async (): Promise<{ ok: boolean }> => {
      const res = await fetch("/api/system/ai-config/revalidate", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data;
    },
  });
}
