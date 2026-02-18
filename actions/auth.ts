"use server";

import { auth } from "@/lib/auth";
import { signInSchema, signUpSchema } from "@/lib/zod";
import { headers } from "next/headers";
import z from "zod";

export async function signInAction(value: z.infer<typeof signInSchema>) {
  const validation = signInSchema.safeParse(value);

  if (!validation.success) {
    return {
      error: "Invalid input data",
    };
  }

  const { email, password, type } = validation.data;

  try {
    const session = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: await headers(),
    });

    const role = session?.user?.role || "user";
    return { success: true, role };
  } catch (error) {
    if (auth.$ERROR_CODES.INVALID_EMAIL_OR_PASSWORD) {
      return { error: "Invalid email or password" };
    }
    return { error: "Sign-in failed" };
  }
}

export async function signUpAction(value: z.infer<typeof signUpSchema>) {
  const validation = signUpSchema.safeParse(value);

  if (!validation.success) {
    return {
      error: "Invalid input data",
    };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        name: validation.data.name,
        email: validation.data.email,
        password: validation.data.password,
      },
    });

    return { success: "Account created successfully" };
  } catch (error) {
    if (
      auth.$ERROR_CODES.USER_ALREADY_EXISTS ||
      auth.$ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL
    ) {
      return { error: "User already exists, use another email" };
    }
    return { error: "Failed to create account" };
  }
}

export async function signOutAction() {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
    return { success: "Signed out successfully" };
  } catch (error) {
    return { error: "Failed to sign out" };
  }
}

export async function signInStudentAction(value: {
  id: string;
  classroomCode: string;
}) {
  const { id, classroomCode } = value;

  if (!id || !classroomCode) {
    return { error: "ID and classroom code are required" };
  }

  try {
    // Implement the logic to sign in the student using the provided ID and classroom code
    // This might involve verifying the classroom code, checking if the student exists, etc.

    await auth.api.signInStudent({
      body: {
        id,
        classroomCode,
      },
      headers: await headers(),
    });

    return { success: "Student signed in successfully" };
  } catch (error) {
    return { error: "Failed to sign in student" };
  }
}
