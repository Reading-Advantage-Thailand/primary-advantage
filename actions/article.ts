"use server";

import { generateAllArticle } from "@/server/controllers/articleController";
import {
  deleteArticleByIdModel,
  getArticleActivity,
} from "@/server/models/articleModel";

export async function generateArticle(amountPerGenre: number) {
  const result = await generateAllArticle(amountPerGenre);
  return result;
}

export async function getDeleteArticleById(articleId: string) {
  return await deleteArticleByIdModel(articleId);
}

export async function fetchArticleActivity(articleId: string) {
  try {
    const result = await getArticleActivity(articleId);

    if (!result.success) {
      return { error: "Article activity not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error tracking article access:", error);
    return { error: "Failed to track article access" };
  }
}
