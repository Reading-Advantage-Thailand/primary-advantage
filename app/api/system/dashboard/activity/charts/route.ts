import { fetchSystemActivityChartsController } from "@/server/controllers/systemController";
import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const dateRange = searchParams.get("dateRange") || "";

      const activityCharts =
        await fetchSystemActivityChartsController(dateRange);
      return NextResponse.json(activityCharts, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["SYSTEM_ACCESS"],
);
