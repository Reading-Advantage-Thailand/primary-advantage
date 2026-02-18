import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  checkStoryChapterFlashcardExistsController,
  saveStoryChapterFlashcardController,
  SaveStoryChapterFlashcardInput,
} from "@/server/controllers/flashcardController";

// ============================================================================
// Types for Request Body
// ============================================================================

interface SaveStoryChapterFlashcardRequest
  extends SaveStoryChapterFlashcardInput {}

// ============================================================================
// Route Handlers (View Layer)
// ============================================================================

/**
 * POST /api/flashcard/story-chapter
 * Save story chapter wordlist and sentences to flashcard deck
 */
export async function POST(request: Request) {
  try {
    // Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body: SaveStoryChapterFlashcardRequest = await request.json();

    // Validate required field
    if (!body.storyChapterId) {
      return NextResponse.json(
        { message: "storyChapterId is required" },
        { status: 400 },
      );
    }

    // Call controller
    const result = await saveStoryChapterFlashcardController(user.id, body);

    // Return response
    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Error in POST /api/flashcard/story-chapter:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/flashcard/story-chapter?storyChapterId=xxx
 * Check if flashcards already exist for a story chapter
 */
export async function GET(request: Request) {
  try {
    // Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const storyChapterId = searchParams.get("storyChapterId");

    // Validate required field
    if (!storyChapterId) {
      return NextResponse.json(
        { message: "storyChapterId is required" },
        { status: 400 },
      );
    }

    // Call controller
    const result = await checkStoryChapterFlashcardExistsController(
      user.id,
      storyChapterId,
    );

    // Return response
    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error in GET /api/flashcard/story-chapter:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
