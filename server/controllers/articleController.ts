"use server";

import {
  ActivityType,
  ArticleBaseCefrLevel,
  ArticleType,
  FlashcardType,
} from "@/types/enum";
import {
  generateArticles,
  getArticlesWithParams,
  getArticleById,
  getQuestionsByArticleId,
  getAllFlashcards,
  deleteFlashcardById,
} from "../models/articleModel";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";

export const generateAllArticle = async (amountPerGenre: number) => {
  const types: ArticleType[] = [ArticleType.FICTION, ArticleType.NONFICTION];
  const levels: ArticleBaseCefrLevel[] = [
    ArticleBaseCefrLevel.A1,
    ArticleBaseCefrLevel.A2,
    ArticleBaseCefrLevel.B1,
    ArticleBaseCefrLevel.B2,
    // ArticleBaseCefrLevel.C1,
    // ArticleBaseCefrLevel.C2,
  ];

  const totalArticles = types.length * levels.length * amountPerGenre;
  const articles: any[] = [];
  let completedArticles = 0;

  console.log(`Starting generation of ${totalArticles} articles...`);

  try {
    for (let i = 0; i < amountPerGenre; i++) {
      for (const type of types) {
        for (const level of levels) {
          try {
            await generateArticles({ type, level });
            completedArticles++;
            console.log(
              `Progress: ${completedArticles}/${totalArticles} articles generated (Type: ${type}, Level: ${level})`,
            );
          } catch (error: any) {
            console.error(
              `Failed to generate article (Type: ${type}, Level: ${level}):`,
              error,
            );
            throw new Error(`Failed to generate article: ${error.message}`);
          }
        }
      }
    }

    console.log(`Successfully generated ${completedArticles} articles`);
    return articles;
  } catch (error: any) {
    console.error("Error in generateAllArticle:", error);
    throw new Error(`Failed to generate all articles: ${error.message}`);
  }
};

export const fetchArticles = async (req: URLSearchParams) => {
  const title = req.get("title") ?? undefined;
  const type = req.get("type") ?? undefined;
  const genre = req.get("genre") ?? undefined;
  const subgenre = req.get("subgenre") ?? undefined;
  const cefrLevel = req.get("cefrLevel") ?? undefined;
  const limit = parseInt(req.get("limit") || "10", 10);
  const offset = parseInt(req.get("offset") || "0", 10);

  return getArticlesWithParams({
    title,
    type,
    genre,
    subgenre,
    cefrLevel,
    limit,
    offset,
  });
};

export const fetchArticleById = async (req: URLSearchParams) => {
  const articleId = req.get("articleId") ?? undefined;

  if (!articleId) {
    throw new Error("Article ID is required");
  }

  return getArticleById(articleId);
};

// export const fetchQuestionFeedback = async (req: {
//   data: {
//     articleId: string;
//     question: string;
//     answer: string;
//     suggestedResponse?: string;
//     preferredLanguage: string;
//   };
//   activityType: ActivityType;
// }) => {
//   return getQuestionFeedback(req);
// };

// export const fetchQuestionsByArticleId = async (req: URLSearchParams) => {
//   const articleId = req.get("articleId") ?? undefined;

//   if (!articleId) {
//     throw new Error("Article ID is required");
//   }

//   return getQuestionsByArticleId(articleId);
// };

export const fetchAllFlashcards = async (req: URLSearchParams) => {
  try {
    const userId = await currentUser();

    if (!userId) {
      throw new Error("User not found");
    }

    return getAllFlashcards(userId.id);
  } catch (error) {
    console.error("Error in fetchAllFlashcards:", error);
    throw new Error("Failed to fetch all flashcards");
  }
};

export const deleteFlashcardByIdAction = async (flashcardId: string) => {
  try {
    if (!flashcardId) {
      return { success: false, error: "Flashcard ID is required" };
    }

    await deleteFlashcardById(flashcardId);
    return { success: true, message: "Flashcard deleted successfully" };
  } catch (error) {
    console.error("Error in deleteFlashcardByIdAction:", error);
    return { success: false, error: "Failed to delete flashcard" };
  }
};
