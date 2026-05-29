import { NextRequest } from "next/server";
import { saveArticleAndPublish } from "@/server/controllers/articleController";

/**
 * Handles POST requests to approve and publish a custom article.
 */
export async function POST(req: NextRequest) {
  return await saveArticleAndPublish(req);
}
