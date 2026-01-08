import { AuthenticatedUser, withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { fetchDashboardHeatmapController } from "@/server/controllers/dashboardController";

export const GET = withAuth(async (req, context, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const entityIds = searchParams.get("entityIds") || "";
    const timeframe = searchParams.get("timeframe") || "";

    const heatmapData = await fetchDashboardHeatmapController(
      entityIds,
      timeframe,
      user as AuthenticatedUser,
    );
    return NextResponse.json(heatmapData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
