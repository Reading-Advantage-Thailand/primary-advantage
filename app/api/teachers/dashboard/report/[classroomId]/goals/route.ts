import { NextResponse } from "next/server";
import { withAuth } from "@/server/utils/middleware";
import {
  createTeacherClassGoalController,
  deleteTeacherClassGoalController,
  fetchTeacherClassGoalController,
} from "@/server/controllers/teacherController";

export const GET = withAuth(async (req, context, user) => {
  try {
    const { classroomId } = await context.params;

    // Fetch report data for the given classroomId
    const response = await fetchTeacherClassGoalController(classroomId);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (req, context, user) => {
  try {
    const { classroomId } = await context.params;
    const body = await req.json();

    // Fetch report data for the given classroomId
    const response = await createTeacherClassGoalController(classroomId, body);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const PUT = withAuth(async (req, context, user) => {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
});

export const DELETE = withAuth(async (req, context, user) => {
  try {
    const { classroomId } = await context.params;
    const body = await req.json();

    // Fetch report data for the given classroomId
    const response = await deleteTeacherClassGoalController(classroomId, body);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
