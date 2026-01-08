import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { fetchTeacherDashboardController } from "@/server/controllers/teacherController";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const dashboardData = await fetchTeacherDashboardController(user.id);
      return NextResponse.json(dashboardData, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["TEACHER_ACCESS"],
);
