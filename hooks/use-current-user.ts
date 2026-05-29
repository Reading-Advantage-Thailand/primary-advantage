import { useSession } from "next-auth/react";

/**
 * Hook that returns the current user from the session.
 */
export const useCurrentUser = () => {
  const { data: session } = useSession();
  // console.log("useCurrentUser Debug - Session:", session);
  return session?.user;
};
