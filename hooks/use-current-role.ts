import { authClient } from "@/lib/auth-client";

export const useCurrentRole = () => {
  const { data: session } = authClient.useSession();
  return session?.user?.role;
};
