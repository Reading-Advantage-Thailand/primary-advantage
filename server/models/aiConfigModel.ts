/**
 * aiConfigModel.ts
 *
 * Prisma layer for the AI Config admin API. All functions are pure data-access
 * with no HTTP or caching concerns — those live in the controller.
 *
 * Tables: AiProvider (platform-global, no schoolId), AiTaskConfig
 */

import { prisma } from "@/lib/prisma";
import type { AiProvider, AiTaskConfig, AiProviderKind } from "@prisma/client";

// ---------------------------------------------------------------------------
// Default-provider guard
// ---------------------------------------------------------------------------

/**
 * Returns true for platform-managed provider kinds (VERTEX, OPENAI).
 * Only OPENAI_COMPATIBLE providers are user-managed via the Admin API.
 */
export function isDefaultProviderKind(kind: AiProviderKind): boolean {
  return kind === "VERTEX" || kind === "OPENAI";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProviderRow = Pick<
  AiProvider,
  | "id"
  | "name"
  | "kind"
  | "baseUrl"
  | "apiKeyRef"
  | "enabled"
  | "createdAt"
  | "updatedAt"
>;

export type TaskRow = {
  taskKey: string;
  capability: string;
  providerId: string;
  providerName: string;
  providerKind: string;
  modelId: string;
  temperature: number | null;
  updatedAt: Date;
  updatedBy: string | null;
  updatedByName: string | null;
};

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export async function listProviders(): Promise<ProviderRow[]> {
  return prisma.aiProvider.findMany({
    select: {
      id: true,
      name: true,
      kind: true,
      baseUrl: true,
      apiKeyRef: true,
      enabled: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ enabled: "desc" }, { name: "asc" }],
  });
}

export async function createProvider(data: {
  name: string;
  kind: AiProviderKind;
  baseUrl?: string | null;
  apiKeyRef?: string | null;
  enabled: boolean;
}): Promise<ProviderRow> {
  return prisma.aiProvider.create({
    data: {
      name: data.name,
      kind: data.kind,
      baseUrl: data.baseUrl ?? null,
      apiKeyRef: data.apiKeyRef ?? null,
      enabled: data.enabled,
    },
    select: {
      id: true,
      name: true,
      kind: true,
      baseUrl: true,
      apiKeyRef: true,
      enabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getProviderById(id: string): Promise<AiProvider | null> {
  return prisma.aiProvider.findUnique({ where: { id } });
}

export async function updateProvider(
  id: string,
  data: {
    name?: string;
    baseUrl?: string | null;
    apiKeyRef?: string | null;
    enabled?: boolean;
  },
): Promise<ProviderRow> {
  return prisma.aiProvider.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      kind: true,
      baseUrl: true,
      apiKeyRef: true,
      enabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Returns the taskKeys that reference this provider (used for 409 check).
 */
export async function getTaskKeysByProvider(
  providerId: string,
): Promise<string[]> {
  const tasks = await prisma.aiTaskConfig.findMany({
    where: { providerId },
    select: { taskKey: true },
  });
  return tasks.map((t) => t.taskKey);
}

export async function deleteProvider(id: string): Promise<AiProvider> {
  return prisma.aiProvider.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function listTasks(): Promise<TaskRow[]> {
  const rows = await prisma.aiTaskConfig.findMany({
    orderBy: { taskKey: "asc" },
    include: {
      provider: { select: { name: true, kind: true } },
    },
  });

  // Batch-resolve updatedBy user ids → names (single query, no N+1).
  const editorIds = [
    ...new Set(rows.map((r) => r.updatedBy).filter((v): v is string => !!v)),
  ];
  const users = editorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: editorIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return rows.map((r) => ({
    taskKey: r.taskKey,
    capability: r.capability,
    providerId: r.providerId,
    providerName: r.provider.name,
    providerKind: r.provider.kind,
    modelId: r.modelId,
    temperature: r.temperature,
    updatedAt: r.updatedAt,
    updatedBy: r.updatedBy,
    updatedByName: r.updatedBy ? (nameById.get(r.updatedBy) ?? null) : null,
  }));
}

export async function getTaskByKey(
  taskKey: string,
): Promise<
  (AiTaskConfig & { provider: { name: string; kind: string } }) | null
> {
  return prisma.aiTaskConfig.findUnique({
    where: { taskKey },
    include: { provider: { select: { name: true, kind: true } } },
  });
}

export async function updateTask(
  taskKey: string,
  data: {
    providerId?: string;
    modelId?: string;
    temperature?: number | null;
    updatedBy: string;
  },
): Promise<TaskRow> {
  const { updatedBy, ...rest } = data;
  const row = await prisma.aiTaskConfig.update({
    where: { taskKey },
    data: { ...rest, updatedBy },
    include: { provider: { select: { name: true, kind: true } } },
  });

  // Resolve the editor's name (single lookup; updatedBy is always set on writes).
  let updatedByName: string | null = null;
  if (row.updatedBy) {
    const user = await prisma.user.findUnique({
      where: { id: row.updatedBy },
      select: { name: true },
    });
    updatedByName = user?.name ?? null;
  }

  return {
    taskKey: row.taskKey,
    capability: row.capability,
    providerId: row.providerId,
    providerName: row.provider.name,
    providerKind: row.provider.kind,
    modelId: row.modelId,
    temperature: row.temperature,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    updatedByName,
  };
}
