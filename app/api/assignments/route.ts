import {
  postAssignment,
  fetchAssignments,
} from "@/server/controllers/assignmentController";
import { NextRequest } from "next/server";

/**
 * Fetches all assignments filtered by query params.
 */
export async function GET(request: NextRequest) {
  return await fetchAssignments(request);
}

/**
 * Creates a new assignment.
 */
export async function POST(request: NextRequest) {
  return await postAssignment(request);
}
