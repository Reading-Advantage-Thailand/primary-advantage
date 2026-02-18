import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { nextCookies } from "better-auth/next-js";
import { verifyPassword, hashPassword, isBcryptHash } from "@/lib/password";
import { admin, createAuthEndpoint } from "better-auth/plugins";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL as string,
  secret: process.env.BETTER_AUTH_SECRET as string,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: hashPassword,
      verify: async ({ hash, password }) => {
        const isValid = await verifyPassword({ hash, password });

        // Lazy re-hash: migrate bcrypt → scrypt on successful login
        if (isValid && isBcryptHash(hash)) {
          const newHash = await hashPassword(password);
          // Update the account password in the background (don't block login)
          prisma.account
            .updateMany({
              where: {
                password: hash,
                providerId: "credential",
              },
              data: { password: newHash },
            })
            .catch((err) =>
              console.error("Failed to re-hash bcrypt password:", err),
            );
        }

        return isValid;
      },
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
      },
      xp: {
        type: "number",
        required: false,
      },
      level: {
        type: "number",
        required: false,
      },
      cefrLevel: {
        type: "string",
        required: false,
      },
      schoolId: {
        type: "string",
        required: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const defaultRole = await prisma.role.upsert({
            where: { name: "user" },
            update: {},
            create: { name: "user" },
          });

          await prisma.user.update({
            where: { id: user.id },
            data: {
              roleId: defaultRole.id,
              role: defaultRole.name,
            },
          });
        },
      },
    },
  },
  plugins: [
    nextCookies(),
    admin(),
    {
      id: "student-auth",
      endpoints: {
        signInStudent: createAuthEndpoint(
          {
            method: "POST",
            body: z.object({
              id: z.string(),
              classroomCode: z.string(),
            }),
          },
          async (ctx) => {
            const { id, classroomCode } = ctx.body;

            // 1. Verify the classroom code exists and hasn't expired
            const classroom = await prisma.classroom.findFirst({
              where: { passwordStudents: classroomCode },
              select: { id: true, codeExpiresAt: true, students: true },
            });

            if (!classroom) {
              return { error: "Invalid classroom code" };
            } else if (
              classroom.codeExpiresAt &&
              new Date() > classroom.codeExpiresAt
            ) {
              return { error: "Classroom code has expired" };
            }

            const isStudentInClass = classroom.students.some(
              (student) => student.studentId === id,
            );

            if (!isStudentInClass) {
              return { error: "Student not found in this classroom" };
            }

            const student = await prisma.user.findUnique({
              where: { id },
            });

            if (!student) {
              return { error: "Student user not found" };
            }

            const session = await ctx.context.internalAdapter.createSession(
              student.id,
              false,
            );

            if (!session) {
              return { error: "Failed to create session" };
            }

            await setSessionCookie(ctx, { session, user: student }, false);

            return ctx.json({
              user: student,
              session,
            });
          },
        ),
      },
    },
  ],
  session: {
    cookieCache: {
      enabled: false,
      maxAge: 5 * 60, // 5 minutes in seconds
    },
    expiresIn: 12 * 60 * 60, // 12 hours in seconds
    updateAge: 60 * 60, // 1 hour in seconds
  },
});
