"use client";

// SessionProvider is no longer needed with better-auth.
// better-auth uses authClient.useSession() which doesn't require a provider wrapper.
// This file is kept as a no-op for backward compatibility with any existing imports.

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
