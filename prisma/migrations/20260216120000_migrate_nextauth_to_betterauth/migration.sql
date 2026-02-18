-- Migration: NextAuth → Better-Auth
-- This migration converts auth tables from next-auth format to better-auth format.
-- All existing sessions will be invalidated (users must re-login).

-- ============================================================================
-- Step 1: Convert users.email_verified from TIMESTAMP(3) to BOOLEAN
-- ============================================================================

-- Add temporary boolean column
ALTER TABLE "users" ADD COLUMN "email_verified_bool" BOOLEAN NOT NULL DEFAULT false;

-- Migrate data: any non-null timestamp means verified
UPDATE "users" SET "email_verified_bool" = true WHERE "email_verified" IS NOT NULL;

-- Drop old column and rename
ALTER TABLE "users" DROP COLUMN "email_verified";
ALTER TABLE "users" RENAME COLUMN "email_verified_bool" TO "email_verified";

-- ============================================================================
-- Step 2: Add role and role_id columns to users (populate from user_roles)
-- ============================================================================

-- Add columns (use DO block to handle IF NOT EXISTS for ADD COLUMN)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "role" TEXT DEFAULT 'user';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "role_id" TEXT;
  END IF;
END $$;

-- Populate role and role_id from user_roles join table (take first role per user)
UPDATE "users" u
SET
  "role" = sub."role_name",
  "role_id" = sub."role_id"
FROM (
  SELECT DISTINCT ON (ur."userId")
    ur."userId" AS "user_id",
    r."name" AS "role_name",
    r."id" AS "role_id"
  FROM "user_roles" ur
  JOIN "roles" r ON ur."roleId" = r."id"
  ORDER BY ur."userId", r."name"
) sub
WHERE u."id" = sub."user_id";

-- Set default role for users without any role assignment
UPDATE "users"
SET "role" = 'user'
WHERE "role" IS NULL;

-- Add FK constraint (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_id_fkey' AND table_name = 'users'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- Step 3: Transform accounts table (next-auth → better-auth columns)
-- ============================================================================

-- 3a. Rename provider → provider_id
ALTER TABLE "accounts" RENAME COLUMN "provider" TO "provider_id";

-- 3b. Rename provider_account_id → account_id
ALTER TABLE "accounts" RENAME COLUMN "provider_account_id" TO "account_id";

-- 3c. Convert expires_at from INTEGER (unix seconds) to TIMESTAMP
ALTER TABLE "accounts" ADD COLUMN "access_token_expires_at" TIMESTAMP(3);

UPDATE "accounts"
SET "access_token_expires_at" = to_timestamp("expires_at")
WHERE "expires_at" IS NOT NULL;

ALTER TABLE "accounts" DROP COLUMN "expires_at";

-- 3d. Add new better-auth columns
ALTER TABLE "accounts" ADD COLUMN "refresh_token_expires_at" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'password'
  ) THEN
    ALTER TABLE "accounts" ADD COLUMN "password" TEXT;
  END IF;
END $$;

ALTER TABLE "accounts" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "accounts" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3e. Drop old next-auth columns
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "type";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "token_type";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "session_state";

-- 3f. Drop old unique constraint (provider + provider_account_id)
DROP INDEX IF EXISTS "accounts_provider_provider_account_id_key";

-- ============================================================================
-- Step 4: Transform sessions table
-- ============================================================================

-- 4a. Rename expires → expires_at
ALTER TABLE "sessions" RENAME COLUMN "expires" TO "expires_at";

-- 4b. Add new better-auth columns
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "ip_address" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "sessions" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sessions" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================================================
-- Step 5: Replace verification_tokens with verifications table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "verifications" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- Migrate existing verification tokens
INSERT INTO "verifications" ("id", "identifier", "value", "expires_at")
SELECT
  gen_random_uuid()::text,
  "identifier",
  "token",
  "expires"
FROM "verification_tokens"
ON CONFLICT DO NOTHING;

-- Drop old table
DROP TABLE IF EXISTS "verification_tokens";

-- ============================================================================
-- Step 6: Invalidate all sessions (users must re-login)
-- ============================================================================

TRUNCATE TABLE "sessions";

-- ============================================================================
-- Step 7: Create credential accounts for password-based users
-- Better-auth requires an account row for email/password users.
-- Next-auth stored passwords directly on users without account rows.
-- ============================================================================

-- INSERT INTO "accounts" (
--   "user_id", "account_id", "provider_id",
--   "password", "created_at", "updated_at"
-- )
-- SELECT
--   u."id",
--   u."id",
--   'credential',
--   u."password",
--   COALESCE(u."createdAt", CURRENT_TIMESTAMP),
--   CURRENT_TIMESTAMP
-- FROM "users" u
-- WHERE u."password" IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM "accounts" a
--     WHERE a."user_id" = u."id" AND a."provider_id" = 'credential'
--   );
