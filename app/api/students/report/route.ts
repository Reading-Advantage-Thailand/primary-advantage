import { getStudentDashboardController } from "@/server/controllers/studentController";
import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const dashboardData = await getStudentDashboardController(user.id);
      return NextResponse.json(dashboardData, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["STUDENT_ACCESS"],
);
