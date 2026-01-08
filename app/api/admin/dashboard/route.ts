import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { fetchAdminDashboardController } from "@/server/controllers/adminController";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const schoolId = searchParams.get("schoolId") || "";
      const dateRange = searchParams.get("dateRange") || "";

      const dashboardData = await fetchAdminDashboardController(
        schoolId,
        dateRange,
      );
      return NextResponse.json(dashboardData, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["ADMIN_ACCESS"],
);
