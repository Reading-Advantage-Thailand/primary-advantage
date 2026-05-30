/**
 * Shared TypeScript types for the AI Config Admin UI.
 * These mirror the serialised shapes returned by /api/system/ai-config/**
 */

export type AiProviderKind = "VERTEX" | "OPENAI" | "OPENAI_COMPATIBLE";
export type AiCapability = "TEXT" | "IMAGE" | "STREAMING";

export interface AiProvider {
  id: string;
  name: string;
  kind: AiProviderKind;
  baseUrl: string | null;
  apiKeyRef: string | null;
  enabled: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/**
 * Returns true for platform-default providers (VERTEX, OPENAI).
 * These are immutable — they cannot be edited or deleted from the UI.
 */
export function isDefaultProvider(p: { kind: string }): boolean {
  return p.kind === "VERTEX" || p.kind === "OPENAI";
}

export interface AiTaskConfig {
  taskKey: string;
  capability: AiCapability;
  providerId: string;
  providerName: string;
  providerKind: string;
  modelId: string;
  temperature: number | null;
  updatedAt: string; // ISO
  updatedBy: string | null;
  updatedByName: string | null;
}
