import { NextRequest } from "next/server";
import {
  getClassroomController,
  updateClassroomController,
  deleteClassroomController,
} from "@/server/controllers/classroomController";

// GET /api/classroom/[id] - Get a specific classroom with students
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await getClassroomController(req, { params });
}

// PATCH /api/classroom/[id] - Update a classroom
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await updateClassroomController(req, { params });
}

// DELETE /api/classroom/[id] - Delete a classroom
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await deleteClassroomController(req, { params });
}
