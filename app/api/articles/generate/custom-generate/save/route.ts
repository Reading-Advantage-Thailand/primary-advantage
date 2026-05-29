import { NextRequest } from "next/server";
import { saveArticleAsDraft } from "@/server/controllers/articleController";

/**
 * Handles POST requests to save a custom article as a draft.
 */
export async function POST(req: NextRequest) {
  return await saveArticleAsDraft(req);
}
