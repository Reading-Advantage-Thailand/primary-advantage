import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { fetchAdminHeatmapController } from "@/server/controllers/adminController";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const schoolId = searchParams.get("schoolId") || "";
      const timeframe = searchParams.get("timeframe") || "";

      const heatmapData = await fetchAdminHeatmapController(
        schoolId,
        timeframe,
      );
      return NextResponse.json(heatmapData, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["ADMIN_ACCESS"],
);
