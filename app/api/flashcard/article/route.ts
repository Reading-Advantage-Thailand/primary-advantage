import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  checkArticleFlashcardExistsController,
  saveArticleFlashcardController,
  SaveArticleFlashcardInput,
} from "@/server/controllers/flashcardController";

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * POST /api/flashcard/article
 * Save article wordlist and sentences to flashcard deck.
 * Randomly selects 3-5 words and deduplicates across all articles.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body: SaveArticleFlashcardInput = await request.json();

    if (!body.articleId) {
      return NextResponse.json(
        { message: "articleId is required" },
        { status: 400 },
      );
    }

    const result = await saveArticleFlashcardController(user.id, body);

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Error in POST /api/flashcard/article:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/flashcard/article?articleId=xxx
 * Check if flashcards already exist for an article
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("articleId");

    if (!articleId) {
      return NextResponse.json(
        { message: "articleId is required" },
        { status: 400 },
      );
    }

    const result = await checkArticleFlashcardExistsController(
      user.id,
      articleId,
    );

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error in GET /api/flashcard/article:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
