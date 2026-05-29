import { NextRequest } from "next/server";
import { fetchUserLessonProgress } from "@/server/controllers/assignmentController";

/**
 * Fetches user lesson progress for a specific assignment.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await fetchUserLessonProgress(request, { params });
}
