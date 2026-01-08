import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { fetchMetricsCardsController } from "@/server/controllers/systemController";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const dateRange = searchParams.get("dateRange") || "";

      const metricsCards = await fetchMetricsCardsController(dateRange);
      return NextResponse.json(metricsCards, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["SYSTEM_ACCESS"],
);
