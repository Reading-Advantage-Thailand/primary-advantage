import { prisma } from "@/lib/prisma";
import { randomSelectGenre } from "../utils/genaretors/random-select-genre";
import { ActivityType, ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import { generateTopic } from "../utils/genaretors/topic-generator";
import { generateArticle } from "../utils/genaretors/article-generator";
import { evaluateRating } from "../utils/genaretors/evaluate-rating-generator";
import { generateImage } from "../utils/genaretors/image-generator";
import { calculateLevel } from "../../lib/calculateLevel";
import { generateMCQuestion } from "../utils/genaretors/mc-question-generator";
import { generateSAQuestion } from "../utils/genaretors/sa-question-generator";
import { generateLAQuestion } from "../utils/genaretors/la-question-generator";
import { generateWordList } from "../utils/genaretors/wordlist-generator";
import { generateAudio } from "../utils/genaretors/audio-generator";
import { generateAudioForWord } from "../utils/genaretors/audio-word-generator";
import { LAQuestion, MCQuestion, SAQuestion } from "@/types";

export const generateArticles = async (
  type: ArticleType,
  level: ArticleBaseCefrLevel
) => {
  try {
    const randomGenre = await randomSelectGenre({ type });

    const generatedTopic = await generateTopic({
      type: type,
      genre: randomGenre.genre,
      subgenre: randomGenre.subgenre,
    });

    if (
      !generatedTopic.topics ||
      !generatedTopic.genre ||
      !generatedTopic.subgenre
    ) {
      throw new Error("Failed to generate topic or incomplete topic data");
    }

    let generatedArticle;
    let evaluatedArticle;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      generatedArticle = await generateArticle({
        type,
        genre: generatedTopic.genre,
        subgenre: generatedTopic.subgenre,
        topic: generatedTopic.topics || "",
        cefrLevel: level,
      });

      evaluatedArticle = await evaluateRating({
        passage: generatedArticle.passage,
        cefrLevel: level,
      });

      if (evaluatedArticle.rating >= 2) {
        // const { raLevel, cefrLevel } = calculateLevel(
        //   generatedArticle.passage,
        //   level
        // );

        const mcq = await generateMCQuestion({
          type,
          cefrlevel: level,
          passage: generatedArticle.passage,
          title: generatedArticle.title,
          summary: generatedArticle.summary,
          imageDesc: generatedArticle.imageDesc,
        });

        const saq = await generateSAQuestion({
          type,
          cefrlevel: level,
          passage: generatedArticle.passage,
          title: generatedArticle.title,
          summary: generatedArticle.summary,
          imageDesc: generatedArticle.imageDesc,
        });

        const laq = await generateLAQuestion({
          type,
          cefrlevel: level,
          passage: generatedArticle.passage,
          title: generatedArticle.title,
          summary: generatedArticle.summary,
          imageDesc: generatedArticle.imageDesc,
        });

        const wordList = await generateWordList({
          passage: generatedArticle.passage,
        });

        const article = await prisma.article.create({
          data: {
            title: generatedArticle.title,
            passage: generatedArticle.passage,
            summary: generatedArticle.summary,
            imageDescription: generatedArticle.imageDesc,
            genre: randomGenre.genre.replace(/\s*\(.*?\)\s*$/, ""),
            subGenre: randomGenre.subgenre.replace(/\s*\(.*?\)\s*$/, ""),
            type: type,
            rating: evaluatedArticle.rating,
            raLevel: 2,
            cefrLevel: level,
          },
        });

        await generateImage({
          imageDesc: generatedArticle.imageDesc,
          articleId: article.id,
        });

        await prisma.longAnswerQuestion.create({
          data: {
            question: laq.question,
            articleId: article.id,
          },
        });

        await Promise.all(
          saq.questions.map((question) => {
            return prisma.shortAnswerQuestion.create({
              data: {
                question: question.question,
                answer: question.answer,
                articleId: article.id,
              },
            });
          })
        );

        await Promise.all(
          mcq.questions.map((mcq) =>
            prisma.multipleChoiceQuestion.create({
              data: {
                question: mcq.question,
                options: mcq.options,
                answer: mcq.answer,
                articleId: article.id,
              },
            })
          )
        );

        await prisma.wordList.create({
          data: {
            wordlist: wordList.word_list,
            articleId: article.id,
          },
        });

        await generateAudio({
          passage: generatedArticle.passage,
          articleId: article.id,
        });

        await generateAudioForWord({
          wordList: wordList.word_list,
          articleId: article.id,
        });

        break;
      }

      attempts++;
    }
    return;
  } catch (error) {
    console.error("Error generating article:", error);
    throw error;
  }
};

export const getArticlesWithParams = async (params: {
  title?: string;
  type?: string;
  genre?: string;
  subgenre?: string;
  cefrLevel?: string;
  limit: number;
  offset: number;
}) => {
  const { title, type, genre, subgenre, cefrLevel, limit, offset } = params;

  const whereClause: any = {
    ...(title && { title: { contains: title, mode: "insensitive" } }),
    ...(type && { type }),
    ...(genre && { genre: { contains: genre, mode: "insensitive" } }),
    ...(subgenre && { subGenre: { contains: subgenre, mode: "insensitive" } }),
    ...(cefrLevel && { cefrLevel }),
  };

  const articles = await prisma.article.findMany({
    where: whereClause,
    skip: offset,
    take: limit,
  });

  const totalArticles = await prisma.article.count({
    where: whereClause,
  });

  return {
    articles,
    totalArticles,
  };
};

export const getArticleWithId = async (articleId: string) => {
  const fullArticle = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      multipleChoiceQuestions: true,
      shortAnswerQuestions: true,
      longAnswerQuestions: true,
      WordList: true,
    },
  });

  if (!fullArticle) {
    throw new Error("Article not found"); // or return null / 404 response
  }

  const {
    multipleChoiceQuestions,
    shortAnswerQuestions,
    longAnswerQuestions,
    WordList,
    ...article
  } = fullArticle;

  return {
    article,
    questions: {
      multipleChoiceQuestions,
      shortAnswerQuestions,
      longAnswerQuestions,
      WordList,
    },
  };
};

export const getQuestionsWithArticleId = async (
  articleId: string,
  type: ActivityType
) => {
  let questions: MCQuestion[] | SAQuestion[] | LAQuestion[] = [];
  let questionStatus;

  if (type === ActivityType.MC_Question) {
    questionStatus = await prisma.multipleChoiceQuestion_ActivityLog.findMany({
      where: { articleId },
    });

    if (questionStatus) {
      const question = await prisma.multipleChoiceQuestion.findMany({
        where: { articleId },
      });
      const suffledQuestions = question.sort(() => Math.random() - 0.5);
      questions = suffledQuestions.slice(0, 5);
    }
  } else if (type === ActivityType.SA_Question) {
    questionStatus = await prisma.shortAnswerQuestion_ActivityLog.findMany({
      where: { articleId },
    });
    if (questionStatus) {
      const question = await prisma.shortAnswerQuestion.findMany({
        where: { articleId },
      });
      const suffledQuestions = question.sort(() => Math.random() - 0.5);
      questions = suffledQuestions.slice(0, 1);
    }
  } else if (type === ActivityType.LA_Question) {
    questionStatus = await prisma.longAnswerQuestion_ActivityLog.findMany({
      where: { articleId },
    });
    if (questionStatus) {
      questions = await prisma.longAnswerQuestion.findMany({
        where: { articleId },
      });
    }
  }

  if (!questions) {
    throw new Error("Questions not found");
  }

  return { questions, questionStatus };
};
