import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { fetchDailyActivityUsersController } from "@/server/controllers/systemController";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const licenseId = searchParams.get("licenseId") || "";

      const dailyActivityUsers =
        await fetchDailyActivityUsersController(licenseId);

      return NextResponse.json(dailyActivityUsers, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["SYSTEM_ACCESS"],
);
