import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import {
  generateStoryContentController,
  getStoriesController,
  getStoriesGenresController,
} from "@/server/controllers/storieController";

export const GET = withAuth(async (req, context, user) => {
  try {
    // Check if this is a genres request
    const searchParams = req.nextUrl.searchParams;
    const getGenres = searchParams.get("getGenres");

    if (getGenres === "true") {
      const genres = await getStoriesGenresController();
      return NextResponse.json({ genres }, { status: 200 });
    }

    // Get paginated stories with filters
    const result = await getStoriesController(req, user);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (req, context, user) => {
  try {
    const body = await req.json();
    const result = await generateStoryContentController(1);

    return NextResponse.json(
      {
        message: "Story content generation in progress.",
      },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});
