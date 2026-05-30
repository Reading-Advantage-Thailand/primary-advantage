import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A reference to a secret. Two forms are supported:
 *   - "env:VAR_NAME"  — read from process.env at runtime
 *   - "sm:secret-name" — fetch from Google Secret Manager (latest version)
 *   - "sm:projects/<project>/secrets/<name>/versions/<version>" — full resource path passthrough
 */
export type SecretRef = string;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const ENV_PREFIX = "env:";
const SM_PREFIX = "sm:";

// ---------------------------------------------------------------------------
// Singleton SM client
// ---------------------------------------------------------------------------

// Mirror the explicit-credentials pattern used by utils/google.ts (Vertex).
// When VERTEX_CLIENT_EMAIL + VERTEX_PRIVATE_KEY are present we pass them directly
// so the same SA works in local dev and Docker without GOOGLE_APPLICATION_CREDENTIALS.
// When absent (e.g., Cloud Run with an attached runtime SA), we fall back to ADC.
const smClient = new SecretManagerServiceClient({
  projectId: process.env.PROJECT_ID,
  ...(process.env.VERTEX_CLIENT_EMAIL && process.env.VERTEX_PRIVATE_KEY
    ? {
        credentials: {
          client_email: process.env.VERTEX_CLIENT_EMAIL,
          private_key: process.env.VERTEX_PRIVATE_KEY.replace(/\\n/g, "\n"),
        },
      }
    : {}),
});

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const cache = new Map<SecretRef, CacheEntry>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse a SecretRef and return the resource name to pass to Secret Manager.
 * Throws for unsupported prefixes.
 */
function toResourceName(ref: SecretRef): string {
  const shortName = ref.slice(SM_PREFIX.length);

  // Already a fully-qualified resource path (starts with "projects/")
  if (shortName.startsWith("projects/")) {
    return shortName;
  }

  const projectId = process.env.PROJECT_ID;
  if (!projectId) {
    throw new Error(
      `[secretManagerService] PROJECT_ID env var is not set — cannot resolve ref "${ref}"`,
    );
  }

  return `projects/${projectId}/secrets/${shortName}/versions/latest`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a secret reference to its plaintext value.
 * Cached in-memory for 15 minutes per ref.
 *
 * @param ref  "env:VAR_NAME" | "sm:secret-name" | full SM resource path
 * @throws if the ref is malformed, the env var is missing, or SM access fails
 */
export async function getSecret(ref: SecretRef): Promise<string> {
  // --- env: prefix ---
  if (ref.startsWith(ENV_PREFIX)) {
    const varName = ref.slice(ENV_PREFIX.length);
    const value = process.env[varName];
    if (!value) {
      throw new Error(
        `[secretManagerService] env var "${varName}" is not set or empty (ref: "${ref}")`,
      );
    }
    return value;
  }

  // --- sm: prefix ---
  if (ref.startsWith(SM_PREFIX)) {
    // Cache hit
    const cached = cache.get(ref);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Cache miss or expired — fetch from Secret Manager
    const resourceName = toResourceName(ref);
    let payload: string;

    try {
      const [version] = await smClient.accessSecretVersion({
        name: resourceName,
      });
      const data = version.payload?.data;
      if (!data) {
        throw new Error("Empty payload returned from Secret Manager");
      }
      payload =
        typeof data === "string" ? data : Buffer.from(data).toString("utf8");
    } catch (err) {
      throw new Error(
        `[secretManagerService] Failed to read secret (ref: "${ref}"): ${(err as Error).message}`,
      );
    }

    cache.set(ref, { value: payload, expiresAt: Date.now() + CACHE_TTL_MS });
    return payload;
  }

  // --- unsupported ---
  throw new Error(
    `[secretManagerService] Unsupported secret ref "${ref}". Supported prefixes: "${ENV_PREFIX}", "${SM_PREFIX}"`,
  );
}

/**
 * Create or add a new version to a Secret Manager secret.
 *
 * - If the secret does not exist, it is created (replication: automatic — the
 *   GCP default; simplest for a single-region GCP project like ours).
 * - A new version is then added; Secret Manager retains the full version history.
 *
 * @param name   Short secret name (e.g. "openrouter-api-key"), no prefix.
 * @param value  Plaintext secret value.
 * @returns      The canonical SecretRef to store in the DB, e.g. "sm:openrouter-api-key".
 * @throws       If Secret Manager write fails or the SA lacks permissions.
 */
export async function writeSecret(
  name: string,
  value: string,
): Promise<SecretRef> {
  const projectId = process.env.PROJECT_ID;
  if (!projectId) {
    throw new Error(
      `[secretManagerService] PROJECT_ID env var is not set — cannot write secret "${name}"`,
    );
  }

  const secretPath = `projects/${projectId}/secrets/${name}`;
  const ref: SecretRef = `${SM_PREFIX}${name}`;

  // Ensure the secret exists; create it if it doesn't.
  try {
    await smClient.addSecretVersion({
      parent: secretPath,
      payload: { data: Buffer.from(value, "utf8") },
    });
  } catch (err) {
    const grpcCode = (err as { code?: number }).code;
    // gRPC NOT_FOUND = 5
    if (grpcCode === 5) {
      // Secret doesn't exist yet — create it, then add the first version.
      try {
        await smClient.createSecret({
          parent: `projects/${projectId}`,
          secretId: name,
          secret: {
            // Automatic replication: GCP manages distribution across regions.
            replication: { automatic: {} },
          },
        });
        await smClient.addSecretVersion({
          parent: secretPath,
          payload: { data: Buffer.from(value, "utf8") },
        });
      } catch (createErr) {
        throw new Error(
          `[secretManagerService] Failed to create secret "${name}": ${(createErr as Error).message}`,
        );
      }
    } else {
      throw new Error(
        `[secretManagerService] Failed to write secret "${name}": ${(err as Error).message}`,
      );
    }
  }

  // Invalidate cache so next read gets the fresh version.
  invalidateSecretCache(ref);
  return ref;
}

/**
 * Delete a secret (all versions) from Secret Manager.
 *
 * - "sm:<name>" → deletes projects/<PROJECT_ID>/secrets/<name>.
 * - "sm:projects/.../secrets/<name>/versions/..." → the /versions/... suffix is
 *   stripped so we target the secret resource, not a single version.
 * - "env:<NAME>" → no-op (env vars are not GSM-managed).
 * - Idempotent: NOT_FOUND is treated as success (already gone).
 * - Always invalidates the in-memory cache entry for this ref.
 *
 * @throws on unexpected GSM errors (permissions, network, etc.).
 */
export async function deleteSecret(ref: SecretRef): Promise<void> {
  // env: refs are not GSM-managed — nothing to delete.
  if (ref.startsWith(ENV_PREFIX)) {
    invalidateSecretCache(ref);
    return;
  }

  if (ref.startsWith(SM_PREFIX)) {
    const projectId = process.env.PROJECT_ID;
    if (!projectId) {
      throw new Error(
        `[secretManagerService] PROJECT_ID env var is not set — cannot delete secret (ref: "${ref}")`,
      );
    }

    const shortName = ref.slice(SM_PREFIX.length);

    // Derive the secret resource path (projects/<proj>/secrets/<name>).
    // For full paths, strip any trailing "/versions/..." segment.
    let secretResource: string;
    if (shortName.startsWith("projects/")) {
      // e.g. "projects/my-proj/secrets/foo/versions/3" → keep up to "/secrets/<name>"
      const match = shortName.match(/^(projects\/[^/]+\/secrets\/[^/]+)/);
      if (!match) {
        throw new Error(
          `[secretManagerService] Cannot parse secret resource from ref "${ref}"`,
        );
      }
      secretResource = match[1];
    } else {
      secretResource = `projects/${projectId}/secrets/${shortName}`;
    }

    try {
      await smClient.deleteSecret({ name: secretResource });
    } catch (err) {
      const grpcCode = (err as { code?: number }).code;
      // gRPC NOT_FOUND = 5 — secret is already gone; treat as success.
      if (grpcCode !== 5) {
        throw new Error(
          `[secretManagerService] Failed to delete secret (ref: "${ref}"): ${(err as Error).message}`,
        );
      }
    }

    invalidateSecretCache(ref);
    return;
  }

  throw new Error(
    `[secretManagerService] Unsupported secret ref "${ref}". Supported prefixes: "${ENV_PREFIX}", "${SM_PREFIX}"`,
  );
}

/**
 * Invalidate cached secret(s).
 *
 * @param ref  If provided, invalidates only that ref. If omitted, clears all.
 */
export function invalidateSecretCache(ref?: SecretRef): void {
  if (ref !== undefined) {
    cache.delete(ref);
  } else {
    cache.clear();
  }
}
