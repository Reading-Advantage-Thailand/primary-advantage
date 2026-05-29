import { auth } from "./auth";

/**
 * Returns the current authenticated user from the session.
 */
export const currentUser = async () => {
  const session = await auth();
  return session?.user;
};

/**
 * Returns the role of the current authenticated user from the session.
 */
export const currentRole = async () => {
  const session = await auth();
  return session?.user?.role;
};
