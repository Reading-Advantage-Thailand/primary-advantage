import { withAuth } from "@/server/utils/middleware";
import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/types/enum";
import { NextResponse } from "next/server";

const VALID_ACTIVITY_TYPES = new Set([
  ActivityType.MC_QUESTION,
  ActivityType.SA_QUESTION,
  ActivityType.LA_QUESTION,
]);

export const POST = withAuth(async (req, context, user) => {
  try {
    const { articleId, activityType } = await req.json();

    if (!articleId || typeof articleId !== "string") {
      return NextResponse.json(
        { error: "articleId is required" },
        { status: 400 },
      );
    }

    if (!activityType || !VALID_ACTIVITY_TYPES.has(activityType)) {
      return NextResponse.json(
        { error: "Invalid activityType" },
        { status: 400 },
      );
    }

    // Check if an incomplete start record already exists (e.g. user refreshed the page)
    const existing = await prisma.userActivity.findFirst({
      where: {
        userId: user.id,
        activityType,
        targetId: articleId,
        completed: false,
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.userActivity.create({
        data: {
          userId: user.id,
          activityType,
          targetId: articleId,
          completed: false,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging start activity:", error);
    return NextResponse.json(
      { error: "Failed to log start activity" },
      { status: 500 },
    );
  }
});
