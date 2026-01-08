import { NextResponse } from "next/server";
import { withAuth } from "@/server/utils/middleware";
import { fetchAISummaryController } from "@/server/controllers/aiController";
import { AuthenticatedUser } from "@/server/utils/middleware";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const kind = searchParams.get("kind") || "";
      const contextId = searchParams.get("contextId") || "";
      const refresh = searchParams.get("refresh") || "";

      const aiSummary = await fetchAISummaryController(
        kind,
        contextId,
        refresh,
        user as AuthenticatedUser,
      );

      return NextResponse.json(aiSummary, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["STUDENT_ACCESS"],
);
