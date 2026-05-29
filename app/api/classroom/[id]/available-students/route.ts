import { NextRequest } from "next/server";
import { getAvailableStudentsController } from "@/server/controllers/classroomController";

/**
 * Gets available students for enrollment in a specific classroom.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await getAvailableStudentsController(req, { params });
}
