import NextAuth from "next-auth";
import { User } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "./prisma";
import { signInSchema } from "./zod";
import { ZodError } from "zod";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials): Promise<User | null> => {
        // let user = null;
        try {
          const { email, password } = await signInSchema.parseAsync(
            credentials
          );

          if (!credentials) return null;

          const user = await prisma.user.findUnique({
            where: {
              email: email,
            },
          });

          if (user && (await bcrypt.compare(password, user.password ?? ""))) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              xp: user.xp,
              level: user.level,
              cefrLevel: user.cefrLevel,
            } as User;
          } else {
            throw new Error("Invalid credentials.");
          }
        } catch (error) {
          if (error instanceof ZodError) {
            // Return `null` to indicate that the credentials are invalid
            return null;
          }
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          // scope: [
          //   "https://www.googleapis.com/auth/classroom.courses.readonly",
          //   "https://www.googleapis.com/auth/classroom.coursework.me",
          //   "https://www.googleapis.com/auth/classroom.coursework.students",
          //   "https://www.googleapis.com/auth/classroom.rosters.readonly",
          //   "https://www.googleapis.com/auth/classroom.profile.emails",
          // ].join(" "),
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return "/";
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.email = user.email ?? "";
        token.name = user.name ?? "";
        token.role = user.role;
        token.xp = user.xp;
        token.level = user.level;
        token.cefrLevel = user.cefrLevel;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.xp = token.xp;
        session.user.level = token.level;
        session.user.cefrLevel = token.cefrLevel;
      }
      return session;
    },
  },
});
