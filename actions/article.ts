"use server";

import { generateAllArticle } from "@/server/controllers/articleController";
import { deleteArticleById } from "@/server/models/articleModel";

export async function generateArticle(amountPerGenre: number) {
  const result = await generateAllArticle(amountPerGenre);
  return result;
}

export async function getDeleteArticleById(articleId: string) {
  const result = await deleteArticleById(articleId);
  return result;
}
