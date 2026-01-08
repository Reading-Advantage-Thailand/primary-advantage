import { NextResponse } from "next/server";
import { withAuth } from "@/server/utils/middleware";
import {
  createStudentGoalController,
  deleteStudentGoalController,
  fetchStudentGoalController,
  updateStudentGoalController,
} from "@/server/controllers/studentController";

export const GET = withAuth(async (req, context, user) => {
  try {
    const response = await fetchStudentGoalController(user.id);

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
    const body = await req.json();

    // Fetch report data for the given classroomId
    const response = await createStudentGoalController(body, user.id);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const PATCH = withAuth(async (req, context, user) => {
  try {
    const body = await req.json();

    // Fetch report data for the given classroomId
    const response = await updateStudentGoalController(
      body.goalId,
      body,
      user.id,
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(async (req, context, user) => {
  try {
    const body = await req.json();

    // Fetch report data for the given classroomId
    const response = await deleteStudentGoalController(body.goalId, user.id);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
