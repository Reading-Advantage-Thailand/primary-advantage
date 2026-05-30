/**
 * modelResolver.ts
 *
 * The public entry point for generator code to obtain an AI SDK model instance
 * keyed by task (e.g. "article.generate") rather than hard-coded model IDs.
 *
 * Cache strategy (all in-memory, no Redis):
 *   - Task config cache: Map<taskKey, entry>, TTL 5 minutes
 *   - Provider profile cache: Map<providerId, entry>, TTL 5 minutes
 *   - Built LanguageModel/ImageModel objects are NOT cached — they are cheap
 *     to construct, and skipping their cache means API key rotation in Secret
 *     Manager is reflected on the next resolve without a separate flush.
 *     The secretManagerService already caches the raw secret for 15 minutes.
 */

import type { AiProvider, AiTaskConfig } from "@prisma/client";
import type { LanguageModel, ImageModel } from "ai";
import { prisma } from "@/lib/prisma";
import { buildLanguageProvider, buildImageProvider } from "./providerRegistry";
import type { TaskKey } from "./taskKeys";

// ---------------------------------------------------------------------------
// Logging helper
// ---------------------------------------------------------------------------

/**
 * Format a single, consistent log line for AI calls.
 * Example output: "task=article.generate | provider=Vertex Default | model=gemini-3-flash-preview"
 */
export function formatTaskLog(info: {
  taskKey: string;
  modelId: string;
  providerName: string;
}): string {
  return `task=${info.taskKey} | provider=${info.providerName} | model=${info.modelId}`;
}

// ---------------------------------------------------------------------------
// Cache types
// ---------------------------------------------------------------------------

interface TaskConfigEntry {
  config: AiTaskConfig;
  expiresAt: number;
}

interface ProviderProfileEntry {
  profile: AiProvider;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// In-memory caches
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 15 * 1000; // 15 seconds, same as secretManagerService cache to amortise round-trips and ensure rotation is reflected within a reasonable time frame

const taskConfigCache = new Map<string, TaskConfigEntry>();
const providerProfileCache = new Map<string, ProviderProfileEntry>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchTaskConfig(taskKey: string): Promise<AiTaskConfig> {
  const now = Date.now();
  const cached = taskConfigCache.get(taskKey);
  if (cached && cached.expiresAt > now) {
    return cached.config;
  }

  const config = await prisma.aiTaskConfig.findUnique({
    where: { taskKey },
  });

  if (!config) {
    throw new Error(
      `[modelResolver] No task config found for key "${taskKey}". ` +
        `Add it to the AI provider registry seed before using it in generator code.`,
    );
  }

  taskConfigCache.set(taskKey, { config, expiresAt: now + CACHE_TTL_MS });
  return config;
}

async function fetchProviderProfile(providerId: string): Promise<AiProvider> {
  const now = Date.now();
  const cached = providerProfileCache.get(providerId);
  if (cached && cached.expiresAt > now) {
    return cached.profile;
  }

  const profile = await prisma.aiProvider.findUnique({
    where: { id: providerId },
  });

  if (!profile) {
    // Referential integrity means this should never happen in practice, but
    // guard anyway so the error is actionable.
    throw new Error(
      `[modelResolver] Provider with id "${providerId}" not found in the database.`,
    );
  }

  providerProfileCache.set(providerId, {
    profile,
    expiresAt: now + CACHE_TTL_MS,
  });
  return profile;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a language model for the given task key, returning both the model
 * and the resolved metadata (modelId, providerName, temperature).
 *
 * Accepts any capability (TEXT, STREAMING, IMAGE). The IMAGE capability flag
 * is informational — some generators legitimately call generateText() on a
 * Gemini image model (e.g. image-generator.ts reads result.files). Callers
 * that need the Imagen :predict API (generateImage) should use
 * resolveImageTaskModel() instead, which returns an ImageModel.
 */
export async function resolveTaskModel(taskKey: TaskKey | string): Promise<{
  model: LanguageModel;
  modelId: string;
  providerName: string;
  temperature?: number;
}> {
  const config = await fetchTaskConfig(taskKey);
  const profile = await fetchProviderProfile(config.providerId);

  if (!profile.enabled) {
    throw new Error(
      `[modelResolver] Task "${taskKey}" points to disabled provider "${profile.name}".`,
    );
  }

  const buildProvider = await buildLanguageProvider(profile);
  const model = buildProvider(config.modelId);

  return {
    model,
    modelId: config.modelId,
    providerName: profile.name,
    ...(config.temperature !== null && config.temperature !== undefined
      ? { temperature: config.temperature }
      : {}),
  };
}

/**
 * Resolve an ImageModel for the given IMAGE-capability task key, returning both
 * the model and the resolved metadata (modelId, providerName).
 * Used by generators that call generateImage() (Imagen :predict API).
 * Throws if the task is TEXT or STREAMING capability (use resolveTaskModel instead).
 */
export async function resolveImageTaskModel(
  taskKey: TaskKey | string,
): Promise<{
  model: ImageModel;
  modelId: string;
  providerName: string;
}> {
  const config = await fetchTaskConfig(taskKey);

  if (config.capability !== "IMAGE") {
    throw new Error(
      `[modelResolver] Task "${taskKey}" is ${config.capability}-capability. Use getModelForTask() instead.`,
    );
  }

  const profile = await fetchProviderProfile(config.providerId);

  if (!profile.enabled) {
    throw new Error(
      `[modelResolver] Task "${taskKey}" points to disabled provider "${profile.name}".`,
    );
  }

  const buildProvider = await buildImageProvider(profile);
  const model = buildProvider(config.modelId);

  return {
    model,
    modelId: config.modelId,
    providerName: profile.name,
  };
}

/**
 * Resolve a language model for the given task key.
 * Thin wrapper around resolveTaskModel — kept for backward compatibility.
 * Throws if the task is IMAGE-capability (use getImageModelForTask instead).
 */
export async function getModelForTask(
  taskKey: TaskKey | string,
): Promise<LanguageModel> {
  const { model } = await resolveTaskModel(taskKey);
  return model;
}

/**
 * Resolve an ImageModel for the given task key.
 * Thin wrapper around resolveImageTaskModel — kept for backward compatibility.
 * Throws if the task is TEXT or STREAMING capability (use getModelForTask instead).
 */
export async function getImageModelForTask(
  taskKey: TaskKey | string,
): Promise<ImageModel> {
  const { model } = await resolveImageTaskModel(taskKey);
  return model;
}

/**
 * Return the temperature override stored on the task config.
 * Generators that already pass explicit values can use this to honour
 * DB-level overrides when present (undefined means "use the code default").
 */
export async function getTaskParams(
  taskKey: TaskKey | string,
): Promise<{ temperature?: number }> {
  const config = await fetchTaskConfig(taskKey);
  return {
    ...(config.temperature !== null && config.temperature !== undefined
      ? { temperature: config.temperature }
      : {}),
  };
}

/**
 * Clear in-memory caches so the next resolve re-queries the database.
 *
 * @param taskKey  If provided, invalidates only that task's config cache
 *                 and its associated provider profile cache entry.
 *                 If omitted, clears everything.
 *
 * Called by the Admin API after config changes (Phase 6+).
 */
export function invalidateModelCache(taskKey?: string): void {
  if (taskKey !== undefined) {
    const entry = taskConfigCache.get(taskKey);
    taskConfigCache.delete(taskKey);
    // Also evict the provider profile so a provider update (e.g. disabled)
    // is picked up immediately for this task.
    if (entry) {
      providerProfileCache.delete(entry.config.providerId);
    }
  } else {
    taskConfigCache.clear();
    providerProfileCache.clear();
  }
}
