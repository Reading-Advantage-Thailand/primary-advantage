import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import {
  generateArticles,
  getArticlesWithParams,
  getArticleWithId,
} from "../models/articles";
import { NextRequest } from "next/server";

export const generateAllArticle = async (amountPerGenre: number) => {
  const types: ArticleType[] = [ArticleType.FICTION, ArticleType.NONFICTION];
  const levels: ArticleBaseCefrLevel[] = [
    ArticleBaseCefrLevel.A1,
    ArticleBaseCefrLevel.A2,
    ArticleBaseCefrLevel.B1,
    ArticleBaseCefrLevel.B2,
    ArticleBaseCefrLevel.C1,
    ArticleBaseCefrLevel.C2,
  ];

  const articles = [];

  for (let i = 0; i < amountPerGenre; i++) {
    for (const type of types) {
      for (const level of levels) {
        const article = await generateArticles(type, level);
        articles.push(article);
      }
    }
  }

  return articles;
};

export const getArticles = async (req: URLSearchParams) => {
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

export const getArticleById = async (req: URLSearchParams) => {
  const articleId = req.get("articleId") ?? undefined;

  if (!articleId) {
    throw new Error("Article ID is required");
  }

  return getArticleWithId(articleId);
};

export const getQuestionsByArticleId = async (req: URLSearchParams) => {
  const articleId = req.get("articleId") ?? undefined;

  if (!articleId) {
    throw new Error("Article ID is required");
  }

  return getArticleWithId(articleId);
};
