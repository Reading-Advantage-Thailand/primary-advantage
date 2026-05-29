import { fetchAssignments } from "@/server/controllers/assignmentController";
import { NextRequest } from "next/server";

/**
 * Fetches all teacher assignments.
 */
export async function GET(request: NextRequest) {
  return await fetchAssignments(request);
}
