import {
  fetchArticleById,
  deleteArticleById,
} from "@/server/controllers/articleController";
import { getCurrentUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const articles = await fetchArticleById(req.nextUrl.searchParams);

    return NextResponse.json({ articles }, { status: 200 });
  } catch (error) {
    return new Response("Error", { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "system") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { articleId } = await params;

    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 },
      );
    }

    const result = await deleteArticleById(articleId);

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to delete article" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Article deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
