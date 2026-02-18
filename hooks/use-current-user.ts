import { authClient } from "@/lib/auth-client";

export const useCurrentUser = () => {
  const { data: session, isPending, refetch } = authClient.useSession();

  return {
    user: session?.user,
    isLoading: isPending,
    refetch,
  };
};
