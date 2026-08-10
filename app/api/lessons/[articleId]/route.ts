import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  getArticleForLesson,
  resetStandaloneLessonProgress,
  updateStandaloneLessonProgress,
} from "@/server/models/lessonModel";

/**
 * GET /api/lessons/[articleId]
 * Get article data for standalone lesson
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;

    const article = await getArticleForLesson(articleId);

    return NextResponse.json(
      {
        article,
        success: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("API Error - GET /api/lessons/[articleId]:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson data" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/lessons/[articleId]
 * Update progress for standalone lesson
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;
    const body = await req.json();
    const { progress, timeSpent, reset } = body;

    if (reset === true) {
      await resetStandaloneLessonProgress(user.id, articleId);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Validate input
    if (
      typeof progress !== "number" ||
      typeof timeSpent !== "number" ||
      progress < 0 ||
      progress > 100 ||
      timeSpent < 0
    ) {
      return NextResponse.json(
        { error: "Invalid progress or timeSpent data" },
        { status: 400 },
      );
    }

    await updateStandaloneLessonProgress(
      user.id,
      articleId,
      progress,
      timeSpent,
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("API Error - POST /api/lessons/[articleId]:", error);
    return NextResponse.json(
      { error: "Failed to update lesson progress" },
      { status: 500 },
    );
  }
}
