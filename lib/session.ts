import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";

export const getCurrentUser = cache(async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;
    return session.user;
  } catch (err) {
    console.error("[getCurrentUser] session lookup failed:", err);
    return null;
  }
});
