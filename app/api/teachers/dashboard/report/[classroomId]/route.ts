import { fetchTeacherClassReportController } from "@/server/controllers/teacherController";
import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";

export const GET = withAuth(async (req, context, user) => {
  try {
    const { classroomId } = await context.params;

    // Fetch report data for the given classroomId
    const reportData = await fetchTeacherClassReportController(classroomId);

    return NextResponse.json(reportData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
