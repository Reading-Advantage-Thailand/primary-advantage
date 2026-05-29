import {
  generateCustomArticle,
  fetchCustomArticleController,
} from "@/server/controllers/articleController";
import { NextRequest } from "next/server";

/**
 * Handles GET requests to fetch custom articles.
 */
export async function GET(req: NextRequest) {
  return await fetchCustomArticleController(req);
}

/**
 * Handles POST requests to generate a new custom article.
 */
export async function POST(req: NextRequest) {
  return await generateCustomArticle(req);
}
