import { getArticles } from "@/server/controllers/articleController";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { articles, totalArticles } = await getArticles(
      req.nextUrl.searchParams
    );

    return NextResponse.json({ articles, totalArticles }, { status: 200 });
  } catch (error) {
    return new Response("Error", { status: 500 });
  }
}
