import { NextRequest, NextResponse } from "next/server";
import {
  getTeachersController,
  createTeacherController,
} from "@/server/controllers/teacherController";

// GET /api/teachers - Fetch teachers data for admin
/**
 * Retrieves a paginated list of teachers with optional filtering.
 */
export async function GET(request: NextRequest) {
  return await getTeachersController(request);
}

// POST /api/teachers - Create new teacher
/**
 * Creates a new teacher.
 */
export async function POST(request: NextRequest) {
  return await createTeacherController(request);
}
