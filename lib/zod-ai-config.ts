/**
 * Zod schemas for the AI Config admin API (/api/system/ai-config/**).
 *
 * Kept in a separate file (not appended to lib/zod.ts) because the AI config
 * domain is self-contained and the schemas are consumed by both controller and
 * test files.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared enums (mirror Prisma enums to avoid importing @prisma/client in zod files)
// ---------------------------------------------------------------------------

export const AiProviderKindSchema = z.enum([
  "VERTEX",
  "OPENAI",
  "OPENAI_COMPATIBLE",
]);
export const AiCapabilitySchema = z.enum(["TEXT", "IMAGE", "STREAMING"]);

// ---------------------------------------------------------------------------
// POST /api/system/ai-config/providers
// ---------------------------------------------------------------------------

export const createProviderBodySchema = z.object({
  name: z.string().min(1, "name is required").max(200),
  // Only OPENAI_COMPATIBLE providers are user-managed; VERTEX and OPENAI are platform defaults.
  kind: z.literal("OPENAI_COMPATIBLE"),
  baseUrl: z.url("baseUrl must be a valid URL"),
  apiKey: z.string().min(1),
  enabled: z.boolean().optional(),
});

export type CreateProviderBody = z.infer<typeof createProviderBodySchema>;

// ---------------------------------------------------------------------------
// PATCH /api/system/ai-config/providers/:id
// ---------------------------------------------------------------------------

export const updateProviderBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    baseUrl: z.url("baseUrl must be a valid URL").nullable().optional(),
    apiKey: z.string().min(1).optional(),
    enabled: z.boolean().optional(),
    // kind is intentionally omitted — changing kind is rejected at the controller level
  })
  .loose() // loose so we can detect unexpected fields like `kind`
  .superRefine((data, ctx) => {
    // Reject `kind` in the body
    if ("kind" in data) {
      ctx.addIssue({
        code: "custom",
        path: ["kind"],
        message: "kind cannot be changed after creation",
      });
    }
  });

export type UpdateProviderBody = z.infer<typeof updateProviderBodySchema>;

// ---------------------------------------------------------------------------
// PATCH /api/system/ai-config/tasks/:taskKey
// ---------------------------------------------------------------------------

export const updateTaskBodySchema = z
  .object({
    providerId: z.string().min(1).optional(),
    modelId: z.string().min(1).optional(),
    temperature: z.number().min(0).max(2).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
