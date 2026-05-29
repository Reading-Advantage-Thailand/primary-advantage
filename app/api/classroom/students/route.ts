import { fetchStudentsByRole } from "@/server/controllers/classroomController";

/**
 * Gets students based on user role (system sees all, teacher sees only their students).
 */
export async function GET() {
  return await fetchStudentsByRole();
}
