import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import {
  generateArticles,
  getArticlesWithParams,
  getArticleById,
  getQuestionsByArticleId,
  getAllFlashcards,
  deleteFlashcardById,
  getCustomArticle,
  deleteArticleByIdModel,
  createdArticleCustom,
  checkExistingArticle,
  updateAprovedCustomArticle,
} from "../models/articleModel";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { generateArticle } from "../utils/genaretors/article-generator";
import { evaluateRating } from "../utils/genaretors/evaluate-rating-generator";
import { generateMCQuestion } from "../utils/genaretors/mc-question-generator";
import { generateLAQuestion } from "../utils/genaretors/la-question-generator";
import { generateSAQuestion } from "../utils/genaretors/sa-question-generator";
import {
  saveArticleContent,
  generateQuestions,
  saveArticleAsDraftModel,
} from "../models/articleModel";
import { generateArticleNew } from "../utils/genaretors/new-generator";

/**
 * Generates new articles using the new generator at A0 level.
 * @param amountPerGenre - Number of articles to generate per genre
 */
export const generateAllArticleNew = async (amountPerGenre: number) => {
  const types: ArticleType[] = [ArticleType.FICTION];
  const levels: ArticleBaseCefrLevel[] = [
    ArticleBaseCefrLevel.A0,
    ArticleBaseCefrLevel.A1,
    ArticleBaseCefrLevel.A2,
    ArticleBaseCefrLevel.B1,
    ArticleBaseCefrLevel.B2,
  ];

  const totalArticles = types.length * levels.length * amountPerGenre;
  const articles: any[] = [];
  let completedArticles = 0;

  try {
    console.log(`Starting generation of ${amountPerGenre} articles...`);
    for (let i = 0; i < amountPerGenre; i++) {
      console.log(`Generating article number ${i + 1}`);
      await generateArticleNew(ArticleBaseCefrLevel.A0);
    }
    console.log(`Successfully generated ${amountPerGenre} articles`);
  } catch (error) {
    console.error("Error in generateAllArticleNew:", error);
    throw new Error(`Failed to generate all articles: ${error}`);
  }
};

/**
 * Generates articles across all types and levels for a given amount per genre.
 * @param amountPerGenre - Number of articles to generate per genre
 */
export const generateAllArticle = async (amountPerGenre: number) => {
  const types: ArticleType[] = [ArticleType.FICTION, ArticleType.NONFICTION];
  const levels: ArticleBaseCefrLevel[] = [
    ArticleBaseCefrLevel.A1,
    ArticleBaseCefrLevel.A2,
    ArticleBaseCefrLevel.B1,
    ArticleBaseCefrLevel.B2,
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

/**
 * Fetches articles with optional filtering by title, type, genre, subgenre, and CEFR level.
 * @param req - URLSearchParams containing query filters and pagination params
 */
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

/**
 * Fetches a single article by its ID.
 * @param req - URLSearchParams containing the articleId
 */
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

/**
 * Deletes an article by its ID.
 * @param articleId - The ID of the article to delete
 */
export const deleteArticleById = async (articleId: string) => {
  return deleteArticleByIdModel(articleId);
};

/**
 * Fetches all flashcards for the current authenticated user.
 * @param req - URLSearchParams (unused, kept for signature consistency)
 */
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

/**
 * Deletes a flashcard by its ID and returns success status.
 * @param flashcardId - The ID of the flashcard to delete
 */
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

/**
 * Generates a custom article based on user-provided parameters (type, genre, subgenre, topic, cefrLevel).
 * @param req - NextRequest containing the article generation parameters
 */
export const generateCustomArticle = async (req: NextRequest) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { type, genre, subgenre, topic, cefrLevel } = await req.json();

    const article = await generateArticle({
      type,
      cefrLevel,
      genre,
      subgenre,
      topic,
    });

    const evaluatedArticle = await evaluateRating({
      passage: article.passage,
      cefrLevel,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Custom article generated successfully",
        data: { ...article, ...evaluatedArticle, topic },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in generateCustomArticle:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate custom article" },
      { status: 500 },
    );
  }
};

/**
 * Saves a custom-generated article and publishes it.
 * @param req - NextRequest containing the article data
 */
export const saveArticleAndPublish = async (req: NextRequest) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestBody = await req.json();
    // Handle both { article } and { data } formats from frontend
    const article = requestBody.article || requestBody.data;

    // const existingArticle = await checkExistingArticle(data.id);

    if (!article.id) {
      await createdArticleCustom(article);
    } else {
      await updateAprovedCustomArticle(article.id);
    }

    return NextResponse.json(
      { success: true, message: "Article saved and published successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in saveArticleCustomGenerate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save article" },
      { status: 500 },
    );
  }
};

/**
 * Saves an article as a draft without publishing it.
 * @param req - NextRequest containing the article data, type, genre, and subgenre
 */
export const saveArticleAsDraft = async (req: NextRequest) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { article, type, genre, subgenre } = await req.json();

    await saveArticleAsDraftModel(article, type, genre, subgenre);

    return NextResponse.json(
      { success: true, message: "Article saved as draft successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in saveArticleAsDraft:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save article as draft" },
      { status: 500 },
    );
  }
};

/**
 * Fetches all custom articles authored by the current user.
 * @param req - NextRequest (unused, kept for signature consistency)
 */
export const fetchCustomArticleController = async (req: NextRequest) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customArticles = await getCustomArticle(user.id as string);

    return NextResponse.json({ articles: customArticles }, { status: 200 });
  } catch (error) {
    console.error("Error in fetchCustomArticleController:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch custom article" },
      { status: 500 },
    );
  }
};
