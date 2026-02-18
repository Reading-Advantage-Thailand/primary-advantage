// better-auth user fields are configured in lib/auth.ts via user.additionalFields
// This file can be used for any additional global type declarations

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role?: string;
  level?: number;
  xp?: number;
  cefrLevel?: string;
  schoolId?: string;
}
