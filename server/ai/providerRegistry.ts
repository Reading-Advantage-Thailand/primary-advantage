/**
 * providerRegistry.ts
 *
 * Builds an AI SDK provider callable from a persisted AiProvider profile.
 * Called by modelResolver.ts — do not call directly from generator code.
 *
 * Design notes:
 * - VERTEX: We import the singleton `google` from utils/google.ts rather than
 *   constructing a fresh createVertex() each time. This reuses the existing
 *   production credential setup and avoids duplicating env-var handling.
 *   The singleton is safe to share because Vertex auth uses a service account
 *   (env vars at startup), not a per-request API key that could rotate.
 * - OPENAI / OPENAI_COMPATIBLE: A fresh provider instance is constructed per
 *   call. These are cheap objects (no long-lived connection), and constructing
 *   fresh instances avoids any stale-apiKey risk after Secret Manager rotation.
 *   The secretManagerService caches the underlying secret value for 15 min,
 *   so the SM round-trip is already amortised.
 */

import type { AiProvider } from "@prisma/client";
import type { LanguageModel, ImageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { google } from "@/utils/google";
import { getSecret } from "@/server/services/secretManagerService";

/**
 * Fixed SDK identifier used as the `name` when constructing an
 * OPENAI_COMPATIBLE provider via createOpenAICompatible(). Kept stable and
 * not user-facing so the provider's SDK identity stays constant across rows.
 * (Structured-output support is enabled on the provider via the
 * `supportsStructuredOutputs: true` flag passed to createOpenAICompatible.)
 *
 * The user-facing profile.name still appears in logs and the Admin UI.
 */
export const OPENAI_COMPATIBLE_SDK_NAME = "openaiCompatible";

// ---------------------------------------------------------------------------
// Language provider
// ---------------------------------------------------------------------------

/**
 * Build a function `(modelId: string) => LanguageModel` for the given
 * provider profile. Throws for disabled providers or unsupported kinds.
 */
export async function buildLanguageProvider(
  profile: AiProvider,
): Promise<(modelId: string) => LanguageModel> {
  if (!profile.enabled) {
    throw new Error(
      `[providerRegistry] Provider "${profile.name}" is disabled`,
    );
  }

  switch (profile.kind) {
    case "VERTEX": {
      // Reuse the project singleton — credentials come from env vars at startup.
      return (modelId: string) => google(modelId) as LanguageModel;
    }

    case "OPENAI": {
      if (!profile.apiKeyRef) {
        throw new Error(
          `[providerRegistry] Provider "${profile.name}" (OPENAI) has no apiKeyRef configured`,
        );
      }
      const apiKey = await getSecret(profile.apiKeyRef);
      const openai = createOpenAI({ apiKey });
      return (modelId: string) => openai(modelId) as LanguageModel;
    }

    case "OPENAI_COMPATIBLE": {
      if (!profile.baseUrl) {
        throw new Error(
          `[providerRegistry] Provider "${profile.name}" (OPENAI_COMPATIBLE) has no baseUrl configured`,
        );
      }
      if (!profile.apiKeyRef) {
        throw new Error(
          `[providerRegistry] Provider "${profile.name}" (OPENAI_COMPATIBLE) has no apiKeyRef configured`,
        );
      }
      const apiKey = await getSecret(profile.apiKeyRef);
      const compatible = createOpenAICompatible({
        name: OPENAI_COMPATIBLE_SDK_NAME,
        baseURL: profile.baseUrl,
        apiKey,
        supportsStructuredOutputs: true, // Enable the ai-sdk feature flag for structured outputs
      });
      return (modelId: string) => compatible(modelId) as LanguageModel;
    }

    default: {
      // Exhaustiveness guard — will surface at compile time if a new kind is
      // added to the schema without being handled here.
      const exhaustiveCheck: never = profile.kind;
      throw new Error(
        `[providerRegistry] Unsupported provider kind: ${exhaustiveCheck}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Image provider
// ---------------------------------------------------------------------------

/**
 * Build a function `(modelId: string) => ImageModel` for the given provider.
 * Used by story-generator.ts which calls generateImage() (Imagen :predict API).
 * Only VERTEX supports IMAGE capability today; OPENAI and OPENAI_COMPATIBLE
 * throw a clear error (DALL-E uses a separate API surface — Phase 9).
 *
 * Note: image-generator.ts uses a different path — resolveTaskModel() returning
 * a LanguageModel — because Gemini image models also support generateText()
 * (generateContent API), which is what that generator uses to read result.files.
 */
export async function buildImageProvider(
  profile: AiProvider,
): Promise<(modelId: string) => ImageModel> {
  if (!profile.enabled) {
    throw new Error(
      `[providerRegistry] Provider "${profile.name}" is disabled`,
    );
  }

  switch (profile.kind) {
    case "VERTEX": {
      return (modelId: string) => google.image(modelId) as ImageModel;
    }

    case "OPENAI":
    case "OPENAI_COMPATIBLE": {
      throw new Error(
        `[providerRegistry] Image generation is not supported for provider kind "${profile.kind}" (provider: "${profile.name}"). Only VERTEX supports IMAGE tasks today.`,
      );
    }

    default: {
      const exhaustiveCheck: never = profile.kind;
      throw new Error(
        `[providerRegistry] Unsupported provider kind: ${exhaustiveCheck}`,
      );
    }
  }
}
