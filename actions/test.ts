"use server";

import { getArticleById } from "@/server/models/articles";
import { generateAudio } from "@/server/utils/genaretors/audio-generator";
import { generateWordLists } from "@/server/utils/genaretors/audio-word-generator";
import { deleteFile, uploadToBucket } from "@/utils/storage";

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
export async function uploadArticleImages(articleId: string) {
  const result = await uploadToBucket(
    `${process.cwd()}/public/images/${articleId}.png`,
    `images/${articleId}.png`,
  );
  return result;
}

export async function deleteArticleFile(articleId: string) {
  const result = await deleteFile(articleId);
  return result;
}
