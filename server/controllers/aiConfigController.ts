/**
 * aiConfigController.ts
 *
 * Controller layer for /api/system/ai-config/**
 * Routes call exactly one exported function here; this file owns validation,
 * Secret Manager interaction, and cache invalidation — but not HTTP parsing or
 * permission checking (those are in the route files).
 */

import { NextRequest, NextResponse } from "next/server";
import { AiProviderKind } from "@prisma/client";

import {
  createProviderBodySchema,
  updateProviderBodySchema,
  updateTaskBodySchema,
} from "@/lib/zod-ai-config";
import {
  listProviders,
  createProvider,
  getProviderById,
  updateProvider,
  getTaskKeysByProvider,
  deleteProvider,
  listTasks,
  getTaskByKey,
  updateTask,
  isDefaultProviderKind,
} from "@/server/models/aiConfigModel";
import {
  writeSecret,
  deleteSecret,
} from "@/server/services/secretManagerService";
import { invalidateModelCache } from "@/server/ai/modelResolver";
import type { AuthenticatedUser } from "@/server/utils/middleware";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a stable Secret Manager secret name from a provider name.
 * Algorithm: lowercase, replace non-alphanumeric chars with "-", prefix with "ai-provider-".
 * Example: "OpenRouter Personal" → "ai-provider-openrouter-personal"
 */
function deriveSecretName(providerName: string): string {
  return (
    "ai-provider-" +
    providerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function serializeProvider(row: {
  id: string;
  name: string;
  kind: AiProviderKind;
  baseUrl: string | null;
  apiKeyRef: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    baseUrl: row.baseUrl,
    apiKeyRef: row.apiKeyRef,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeTask(row: {
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
}) {
  return {
    taskKey: row.taskKey,
    capability: row.capability,
    providerId: row.providerId,
    providerName: row.providerName,
    providerKind: row.providerKind,
    modelId: row.modelId,
    temperature: row.temperature,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
    updatedByName: row.updatedByName,
  };
}

// ---------------------------------------------------------------------------
// GET /api/system/ai-config/providers
// ---------------------------------------------------------------------------

export async function listProvidersController(
  _req: NextRequest,
): Promise<NextResponse> {
  try {
    const rows = await listProviders();
    return NextResponse.json(rows.map(serializeProvider), { status: 200 });
  } catch (err) {
    console.error("[aiConfigController] listProviders failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/system/ai-config/providers
// ---------------------------------------------------------------------------

export async function createProviderController(
  req: NextRequest,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: { _errors: ["Invalid JSON body"] },
      },
      { status: 400 },
    );
  }

  const parsed = createProviderBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, kind, baseUrl, apiKey, enabled = true } = parsed.data;

  // Guard: only OPENAI_COMPATIBLE may be created via the API.
  // (Zod schema already enforces this; this is a belt-and-suspenders check.)
  if (isDefaultProviderKind(kind as import("@prisma/client").AiProviderKind)) {
    return NextResponse.json(
      {
        error:
          "Default providers (VERTEX, OPENAI) are managed by the platform and cannot be created. Only OPENAI_COMPATIBLE providers can be added.",
      },
      { status: 400 },
    );
  }

  // Write API key to Secret Manager if provided; never log or return the raw key.
  let apiKeyRef: string | null = null;
  if (apiKey !== undefined) {
    const secretName = deriveSecretName(name);
    try {
      apiKeyRef = await writeSecret(secretName, apiKey);
    } catch (err) {
      console.error(
        "[aiConfigController] writeSecret failed for ref:",
        deriveSecretName(name),
        err,
      );
      return NextResponse.json(
        { error: "Failed to store API key — check Secret Manager permissions" },
        { status: 500 },
      );
    }
  }

  try {
    const row = await createProvider({
      name,
      kind: kind as AiProviderKind,
      baseUrl: baseUrl ?? null,
      apiKeyRef,
      enabled,
    });
    return NextResponse.json(serializeProvider(row), { status: 201 });
  } catch (err: unknown) {
    // Prisma unique constraint: P2002 (name is @unique)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: `A provider named "${name}" already exists` },
        { status: 409 },
      );
    }
    console.error("[aiConfigController] createProvider failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/system/ai-config/providers/:id
// ---------------------------------------------------------------------------

export async function updateProviderController(
  req: NextRequest,
  id: string,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: { _errors: ["Invalid JSON body"] },
      },
      { status: 400 },
    );
  }

  const parsed = updateProviderBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Fetch current provider
  const existing = await getProviderById(id);
  if (!existing) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  // Guard: default providers are immutable.
  if (isDefaultProviderKind(existing.kind)) {
    return NextResponse.json(
      { error: `Default provider "${existing.name}" cannot be modified.` },
      { status: 403 },
    );
  }

  const { name, baseUrl, apiKey, enabled } = parsed.data as {
    name?: string;
    baseUrl?: string | null;
    apiKey?: string;
    enabled?: boolean;
  };

  // Handle new API key: write to Secret Manager under the existing or newly-derived ref name
  let newApiKeyRef: string | undefined;
  if (apiKey !== undefined) {
    // Derive secret name from existing ref (strip "sm:" prefix) or from current name
    const secretName =
      existing.apiKeyRef && existing.apiKeyRef.startsWith("sm:")
        ? existing.apiKeyRef.slice(3)
        : deriveSecretName(existing.name);
    try {
      newApiKeyRef = await writeSecret(secretName, apiKey);
    } catch (err) {
      console.error(
        "[aiConfigController] writeSecret failed for ref:",
        secretName,
        err,
      );
      return NextResponse.json(
        { error: "Failed to store API key — check Secret Manager permissions" },
        { status: 500 },
      );
    }
  }

  try {
    const updated = await updateProvider(id, {
      ...(name !== undefined ? { name } : {}),
      ...(baseUrl !== undefined ? { baseUrl } : {}),
      ...(newApiKeyRef !== undefined ? { apiKeyRef: newApiKeyRef } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    });

    // Invalidate full cache — provider profile cache must drop the stale entry
    invalidateModelCache();

    return NextResponse.json(serializeProvider(updated), { status: 200 });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }
    console.error("[aiConfigController] updateProvider failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/system/ai-config/providers/:id
// ---------------------------------------------------------------------------

export async function deleteProviderController(
  _req: NextRequest,
  id: string,
): Promise<NextResponse> {
  const existing = await getProviderById(id);
  if (!existing) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  // Guard: default providers cannot be deleted (evaluated before task-reference check).
  if (isDefaultProviderKind(existing.kind)) {
    return NextResponse.json(
      { error: `Default provider "${existing.name}" cannot be deleted.` },
      { status: 403 },
    );
  }

  // Check for dependent task configs before doing anything
  const dependentTaskKeys = await getTaskKeysByProvider(id);
  if (dependentTaskKeys.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete provider — ${dependentTaskKeys.length} task(s) still reference it. Reassign the following tasks first: ${dependentTaskKeys.join(", ")}`,
        dependentTaskKeys,
      },
      { status: 409 },
    );
  }

  // Hard-delete the row (source of truth) first.
  try {
    await deleteProvider(id);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      // Race: another request deleted it between our fetch and this delete.
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }
    console.error("[aiConfigController] deleteProvider failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  invalidateModelCache();

  // Best-effort: remove the stored API key from Secret Manager.
  // Never fail the request on cleanup error — the row is already gone;
  // an orphaned secret is minor and logged for manual cleanup.
  if (existing.apiKeyRef) {
    try {
      await deleteSecret(existing.apiKeyRef);
    } catch (e) {
      console.error(
        "[aiConfigController] deleteSecret cleanup failed (orphaned secret):",
        existing.apiKeyRef,
        e,
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

// ---------------------------------------------------------------------------
// GET /api/system/ai-config/tasks
// ---------------------------------------------------------------------------

export async function listTasksController(
  _req: NextRequest,
): Promise<NextResponse> {
  try {
    const rows = await listTasks();
    return NextResponse.json(rows.map(serializeTask), { status: 200 });
  } catch (err) {
    console.error("[aiConfigController] listTasks failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/system/ai-config/tasks/:taskKey
// ---------------------------------------------------------------------------

export async function updateTaskController(
  req: NextRequest,
  taskKey: string,
  user: AuthenticatedUser,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: { _errors: ["Invalid JSON body"] },
      },
      { status: 400 },
    );
  }

  const parsed = updateTaskBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Fetch current task (for capability check)
  const existing = await getTaskByKey(taskKey);
  if (!existing) {
    return NextResponse.json(
      { error: "Task config not found" },
      { status: 404 },
    );
  }

  // Capability compatibility check when switching provider
  const { providerId, modelId, temperature } = parsed.data;
  if (providerId !== undefined) {
    const newProvider = await getProviderById(providerId);
    if (!newProvider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }
    if (!newProvider.enabled) {
      return NextResponse.json(
        {
          error: `Provider "${newProvider.name}" is disabled — enable it before assigning tasks`,
        },
        { status: 422 },
      );
    }
    // IMAGE tasks must stay on VERTEX (OPENAI image generation not yet supported)
    if (existing.capability === "IMAGE" && newProvider.kind !== "VERTEX") {
      return NextResponse.json(
        {
          error: `IMAGE capability tasks must use a VERTEX provider. "${newProvider.name}" is ${newProvider.kind}.`,
        },
        { status: 400 },
      );
    }
  }

  try {
    const updated = await updateTask(taskKey, {
      ...(providerId !== undefined ? { providerId } : {}),
      ...(modelId !== undefined ? { modelId } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      updatedBy: user.id,
    });

    invalidateModelCache(taskKey);

    return NextResponse.json(serializeTask(updated), { status: 200 });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Task config not found" },
        { status: 404 },
      );
    }
    console.error("[aiConfigController] updateTask failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/system/ai-config/revalidate
// ---------------------------------------------------------------------------

export async function revalidateController(
  _req: NextRequest,
): Promise<NextResponse> {
  invalidateModelCache();
  return NextResponse.json({ ok: true }, { status: 200 });
}
