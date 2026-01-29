import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { getStoryByIdController } from "@/server/controllers/storieController";

export const GET = withAuth(async (req, context, user) => {
  try {
    const { storyId } = await context.params;

    if (!storyId) {
      return NextResponse.json(
        { error: "Story ID is required" },
        { status: 400 },
      );
    }

    const story = await getStoryByIdController(storyId, user);

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json({ story }, { status: 200 });
  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});
