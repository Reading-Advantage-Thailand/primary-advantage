"use server";

import { getArticleById } from "@/server/models/articles";
import { generateAudio } from "@/server/utils/genaretors/audio-generator";
import { generateWordLists } from "@/server/utils/genaretors/audio-word-generator";

export async function generateAudios(articleId: string) {
  try {
    const article = await getArticleById(articleId);

    const audio = await generateAudio({
      passage: article.article.passage,
      articleId: articleId,
    });

    return { success: true };
  } catch (error) {
    console.log("error", error);
    return { error: true };
  }
}

export async function generateWordAudios(articleId: string) {
  try {
    // const article = await getArticleById(articleId);

    const audio = await generateWordLists(articleId);

    return { success: true };
  } catch (error) {
    console.log("error", error);
    return { error: true };
  }
}
