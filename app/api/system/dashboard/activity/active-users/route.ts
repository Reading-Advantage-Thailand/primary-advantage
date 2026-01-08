import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { getActiveUsersController } from "@/server/controllers/systemController";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const dateRange = searchParams.get("dateRange") || "";

      const activeUsers = await getActiveUsersController(dateRange);
      return NextResponse.json(activeUsers, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["SYSTEM_ACCESS"],
);
