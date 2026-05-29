"use server";

import { generateSecureCode } from "@/lib/utils";
import {
  createClassCode,
  getClassroomStudentForLogin,
} from "@/server/models/classroomModel";

/**
 * Fetches students by classroom code for login purposes.
 * @param code - The classroom code to look up
 */
export async function fetchStudentsByClassCode(code: string) {
  if (!code || typeof code !== "string") {
    return { success: false, error: "Code is required" };
  }

  const result = await getClassroomStudentForLogin(code);
  const data = await result.json();

  if (!result.ok) {
    return {
      success: false,
      error: data.error,
      status: result.status,
    };
  }

  return {
    success: true,
    students: data.students,
  };
}

/**
 * Creates a secure code for a classroom.
 * @param classroomId - The ID of the classroom to create a code for
 */
export async function createClassroomCode(classroomId: string) {
  const code = generateSecureCode();
  const result = await createClassCode(classroomId, code);

  if (!result) {
    return {
      success: false,
      error: "Failed to create classroom code",
    };
  }

  return {
    success: true,
    code,
  };
}
