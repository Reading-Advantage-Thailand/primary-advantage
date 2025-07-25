import { prisma } from "@/lib/prisma";
import { randomSelectGenre } from "../utils/genaretors/random-select-genre";
import {
  ActivityType,
  ArticleBaseCefrLevel,
  ArticleType,
  QuestionState,
} from "@/types/enum";
import { generateTopic } from "../utils/genaretors/topic-generator";
import { generateArticle } from "../utils/genaretors/article-generator";
import { evaluateRating } from "../utils/genaretors/evaluate-rating-generator";
import { generateImage } from "../utils/genaretors/image-generator";
import { generateMCQuestion } from "../utils/genaretors/mc-question-generator";
import { generateSAQuestion } from "../utils/genaretors/sa-question-generator";
import { generateLAQuestion } from "../utils/genaretors/la-question-generator";
import {
  generateWordList,
  WordListResponse,
} from "../utils/genaretors/wordlist-generator";
import { generateAudio } from "../utils/genaretors/audio-generator";
import { generateWordLists } from "../utils/genaretors/audio-word-generator";
import {
  LAQuestion,
  MCQuestion,
  QuestionResult,
  SAQuestion,
  WordList,
  Article,
} from "@/types";
import { cleanGenre, convertCefrLevel } from "@/lib/utils";
import { deleteFile } from "@/utils/storage";
import { currentUser } from "@/lib/session";
import { FlashcardType } from "@/types/enum";

interface GenerateArticleParams {
  type: ArticleType;
  level: ArticleBaseCefrLevel;
}

interface GeneratedContent {
  article: {
    title: string;
    passage: string;
    summary: string;
    translatedSummary: {
      th: string;
      cn: string;
      tw: string;
      vi: string;
    };
    imageDesc: string;
    rating: number;
    cefrLevel: string;
  };
  mcq: {
    questions: Array<{
      question: string;
      options: string[];
      answer: string;
    }>;
  };
  saq: {
    questions: Array<{
      question: string;
      answer: string;
    }>;
  };
  laq: {
    question: string;
  };
}

const MAX_ATTEMPTS = 3;
const MIN_RATING = 2;

async function generateContent(
  type: ArticleType,
  level: ArticleBaseCefrLevel,
  topic: string,
  genre: string,
  subgenre: string,
): Promise<GeneratedContent> {
  const generatedArticle = await generateArticle({
    type,
    genre,
    subgenre,
    topic,
    cefrLevel: level,
  });

  const evaluatedArticle = await evaluateRating({
    passage: generatedArticle.passage,
    cefrLevel: level,
  });

  if (evaluatedArticle.rating < MIN_RATING) {
    throw new Error("Article rating too low");
  }

  const [mcq, saq, laq] = await Promise.all([
    generateMCQuestion({
      type,
      cefrlevel: level,
      passage: generatedArticle.passage,
      title: generatedArticle.title,
      summary: generatedArticle.summary,
      imageDesc: generatedArticle.imageDesc,
    }),
    generateSAQuestion({
      type,
      cefrlevel: level,
      passage: generatedArticle.passage,
      title: generatedArticle.title,
      summary: generatedArticle.summary,
      imageDesc: generatedArticle.imageDesc,
    }),
    generateLAQuestion({
      type,
      cefrlevel: level,
      passage: generatedArticle.passage,
      title: generatedArticle.title,
      summary: generatedArticle.summary,
      imageDesc: generatedArticle.imageDesc,
    }),
  ]);

  return {
    article: {
      ...generatedArticle,
      rating: evaluatedArticle.rating,
      cefrLevel: evaluatedArticle.cefrLevel as string,
    },
    mcq,
    saq,
    laq,
  };
}

async function saveArticleContent(
  content: GeneratedContent,
  genre: string,
  subgenre: string,
  type: ArticleType,
): Promise<void> {
  const { article, mcq, saq, laq } = content;

  // First create the article to get its ID
  const createdArticle = await prisma.article.create({
    data: {
      title: article.title,
      passage: article.passage,
      summary: article.summary,
      translatedSummary: article.translatedSummary,
      imageDescription: article.imageDesc,
      genre: cleanGenre(genre),
      subGenre: cleanGenre(subgenre),
      type,
      rating: article.rating,
      raLevel: convertCefrLevel(article.cefrLevel),
      cefrLevel: article.cefrLevel,
    },
  });

  const articleId = createdArticle.id;

  await Promise.all([
    // Generate and save image
    generateImage({
      imageDesc: article.imageDesc,
      articleId,
    }),

    // Save questions
    prisma.longAnswerQuestion.create({
      data: {
        question: laq.question,
        articleId,
      },
    }),

    // Save short answer questions
    ...saq.questions.map((question) =>
      prisma.shortAnswerQuestion.create({
        data: {
          question: question.question,
          answer: question.answer,
          articleId,
        },
      }),
    ),

    // Save multiple choice questions
    ...mcq.questions.map((mcq) =>
      prisma.multipleChoiceQuestion.create({
        data: {
          question: mcq.question,
          options: mcq.options,
          answer: mcq.answer,
          articleId,
        },
      }),
    ),

    // Generate audio
    generateAudio({
      passage: article.passage,
      articleId,
    }),

    // Generate word audio
    generateWordLists(articleId),
  ]);

  return;
}

export const generateArticles = async ({
  type,
  level,
}: GenerateArticleParams): Promise<void> => {
  try {
    const randomGenre = await randomSelectGenre({ type });
    if (!randomGenre?.genre || !randomGenre?.subgenre) {
      throw new Error("Failed to generate genre");
    }

    const generatedTopic = await generateTopic({
      type,
      genre: randomGenre.genre,
      subgenre: randomGenre.subgenre,
    });

    if (!generatedTopic.topics) {
      throw new Error("Failed to generate topic");
    }

    let attempts = 0;
    let content: GeneratedContent | null = null;

    while (attempts < MAX_ATTEMPTS) {
      try {
        content = await generateContent(
          type,
          level,
          generatedTopic.topics,
          randomGenre.genre,
          randomGenre.subgenre,
        );
        break;
      } catch (error) {
        attempts++;
        if (attempts === MAX_ATTEMPTS) {
          throw new Error(
            `Failed to generate content after ${MAX_ATTEMPTS} attempts`,
          );
        }
        // Wait before retrying with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)),
        );
      }
    }

    if (!content) {
      throw new Error("Failed to generate content");
    }

    await saveArticleContent(
      content,
      randomGenre.genre,
      randomGenre.subgenre,
      type,
    );
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
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalArticles = await prisma.article.count({
    where: whereClause,
  });

  return {
    articles,
    totalArticles,
  };
};

export const getArticleById = async (articleId: string) => {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    throw new Error("Article not found"); // or return null / 404 response
  }

  return { article };
};

export const getQuestionsByArticleId = async (
  articleId: string,
  type: ActivityType,
): Promise<{
  questions: MCQuestion[] | SAQuestion | LAQuestion;
  result: QuestionResult;
  questionStatus: QuestionState;
}> => {
  const userId = await currentUser();

  if (!userId) {
    throw new Error("User not found");
  }

  if (!articleId) {
    throw new Error("Article ID is required");
  }

  let questionStatus: QuestionState = QuestionState.INCOMPLETE;
  let questions: MCQuestion[] | SAQuestion | LAQuestion;
  let result: QuestionResult = {
    details: {
      timer: 0,
    },
    completed: false,
  };

  try {
    // Check if questions are already completed
    const activities = await prisma.userActivity.findMany({
      where: {
        userId: userId.id,
        targetId: articleId,
        activityType: type,
        completed: true,
      },
    });

    // Map activities to QuestionResult type
    if (activities.length > 0) {
      const activity = activities[0];
      result = {
        details: activity.details as {
          responses?: string[];
          progress?: number[];
          timer: number;
        },
        completed: activity.completed,
      };
      questionStatus = QuestionState.COMPLETED;
      return { questions: [] as MCQuestion[], result, questionStatus };
    }

    // Get questions based on type
    switch (type) {
      case ActivityType.MC_QUESTION:
        const mcQuestions = await prisma.multipleChoiceQuestion.findMany({
          where: { articleId },
        });
        questions = mcQuestions
          .sort(() => Math.random() - 0.5)
          .slice(0, 5)
          .map((q) => ({
            ...q,
            textualEvidence: q.textualEvidence || undefined,
          }));
        break;

      case ActivityType.SA_QUESTION:
        const saQuestions = await prisma.shortAnswerQuestion.findMany({
          where: { articleId },
        });
        if (saQuestions.length === 0) {
          throw new Error(`No SA questions found for article ${articleId}`);
        }
        questions = saQuestions[0];
        break;

      case ActivityType.LA_QUESTION:
        const laQuestions = await prisma.longAnswerQuestion.findMany({
          where: { articleId },
        });
        if (laQuestions.length === 0) {
          throw new Error(`No LA questions found for article ${articleId}`);
        }
        questions = laQuestions[0];
        break;

      default:
        throw new Error(`Unsupported activity type: ${type}`);
    }

    if (!questions || (Array.isArray(questions) && questions.length === 0)) {
      questionStatus = QuestionState.ERROR;
      throw new Error(
        `No questions found for article ${articleId} and type ${type}`,
      );
    }

    return { questions, result, questionStatus };
  } catch (error) {
    questionStatus = QuestionState.ERROR;
    throw error;
  }
};

export const deleteArticleById = async (articleId: string) => {
  try {
    const article = await prisma.article.delete({
      where: { id: articleId },
    });

    const result = await deleteFile(articleId);
    console.log("result", result);

    return { success: true };
  } catch (error) {
    console.error("Error deleting article:", error);
    throw error;
  }
};

export const getAllFlashcards = async (userId: string) => {
  return await prisma.flashcardDeck.findFirst({
    where: {
      userId: userId,
      type: FlashcardType.SENTENCE,
    },
    include: {
      cards: true,
    },
  });
};

export const deleteFlashcardById = async (flashcardId: string) => {
  return await prisma.flashcardCard.delete({
    where: {
      id: flashcardId,
    },
  });
};
