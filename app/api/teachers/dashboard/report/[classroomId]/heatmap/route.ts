import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { fetchTeacherClassHeatMapController } from "@/server/controllers/teacherController";

export const GET = withAuth(async (req, context, user) => {
  try {
    const { classroomId } = await context.params;
    // Parse query parameters
    const expanded =
      req.nextUrl.searchParams.get("expanded") === "false" ? false : true;
    const reportData = await fetchTeacherClassHeatMapController(
      classroomId,
      expanded,
    );

    return NextResponse.json(reportData, { status: 200 });
  } catch (error) {
    console.error("Error fetching teacher class report:", error);
    return NextResponse.json(
      { message: "Failed to fetch class report" },
      { status: 500 },
    );
  }
});
