"use server";

import { z } from "zod";
import { signUpSchema } from "@/lib/zod";
import { createUser } from "@/server/models/userModel";

/**
 * Handles user sign up with validation and creates a new user account.
 * @param value - The sign up data validated against signUpSchema
 */
export async function signUpAction(value: z.infer<typeof signUpSchema>) {
  const validation = signUpSchema.safeParse(value);

  if (!validation.success) {
    return {
      error: "Invalid input data",
    };
  }

  const result = await createUser(validation.data);

  if (result.error) {
    return {
      error: result.error,
    };
  }

  return {
    success: result.success,
  };
}
