import { NextRequest } from "next/server";
import { fetchStudentAssignments } from "@/server/controllers/assignmentController";

/**
 * Fetches all assignments for a specific student.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await fetchStudentAssignments(request, { params });
}
