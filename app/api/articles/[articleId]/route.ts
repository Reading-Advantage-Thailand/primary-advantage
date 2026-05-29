import { fetchArticleById } from "@/server/controllers/articleController";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles GET requests to fetch articles by ID from query parameters.
 */
export async function GET(req: NextRequest) {
  try {
    const articles = await fetchArticleById(req.nextUrl.searchParams);

    return NextResponse.json({ articles }, { status: 200 });
  } catch (error) {
    return new Response("Error", { status: 500 });
  }
}
