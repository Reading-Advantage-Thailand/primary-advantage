import { NextRequest } from "next/server";
import {
  fetchClassrooms,
  createClassroomController,
} from "@/server/controllers/classroomController";

// GET /api/classroom - Get all classrooms for a teacher
export async function GET() {
  return await fetchClassrooms();
}

// POST /api/classroom - Create a new classroom
export async function POST(req: NextRequest) {
  return await createClassroomController(req);
}
