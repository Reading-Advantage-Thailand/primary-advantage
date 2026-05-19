import { NextRequest } from "next/server";
import { updateClassroomController } from "@/server/controllers/classroomController";

// PUT /api/classrooms/[id] - Update a classroom (name, grade, passwordStudents, assignedTeacherIds)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await updateClassroomController(request, { params });
}
