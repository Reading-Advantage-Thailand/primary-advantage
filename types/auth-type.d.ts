import { auth } from "@/lib/auth";

type Session = typeof auth.$Infer.Session;
type User = typeof auth.$Infer.User;

declare module "better-auth" {
  interface User {
    role?: string;
    xp?: number;
    level?: number;
    cefrLevel?: string;
    schoolId?: string;
  }
}
