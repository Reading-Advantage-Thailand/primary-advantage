import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { getChapterByNumberController } from "@/server/controllers/storieController";

export const GET = withAuth(async (req, context, user) => {
  try {
    const { storyId, chapterNum } = await context.params;

    if (!storyId) {
      return NextResponse.json(
        { error: "Story ID is required" },
        { status: 400 },
      );
    }

    if (!chapterNum) {
      return NextResponse.json(
        { error: "Chapter number is required" },
        { status: 400 },
      );
    }

    const chapterNumber = parseInt(chapterNum, 10);

    if (isNaN(chapterNumber) || chapterNumber < 1) {
      return NextResponse.json(
        { error: "Invalid chapter number" },
        { status: 400 },
      );
    }

    const chapter = await getChapterByNumberController(
      storyId,
      chapterNumber,
      user,
    );

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    return NextResponse.json({ chapter }, { status: 200 });
  } catch (error) {
    console.error("Error fetching chapter:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});
