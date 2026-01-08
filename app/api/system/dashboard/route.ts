import { withAuth } from "@/server/utils/middleware";
import { fetchSystemDashboardController } from "@/server/controllers/systemController";
import { NextRequest, NextResponse } from "next/server";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const dateRange = searchParams.get("dateRange") || "";

      const dashboardData = await fetchSystemDashboardController(dateRange);

      return NextResponse.json(dashboardData, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["SYSTEM_ACCESS"],
);
