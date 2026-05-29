import { NextRequest } from "next/server";
import {
  fetchAssignmentById,
  postUserLessonProgress,
} from "@/server/controllers/assignmentController";

/**
 * Fetches assignment by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await fetchAssignmentById(request, { params });
}

/**
 * Posts user lesson progress for an assignment.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await postUserLessonProgress(request, { params });
}
