import { useSession } from "next-auth/react";

/**
 * Hook that returns the current user's role from the session.
 */
export const useCurrentRole = () => {
  const { data: session } = useSession();
  return session?.user?.role;
};
