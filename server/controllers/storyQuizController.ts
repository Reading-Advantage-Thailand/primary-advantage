import { NextRequest } from "next/server";
import { ActivityType } from "@/types/enum";
import { AuthenticatedUser } from "@/server/utils/middleware";
import {
  submitQuizModel,
  retakeMCQuizModel,
  getChapterForFeedback,
  getExistingQuizActivity,
} from "@/server/models/storyQuizModel";
import {
  getSaqFeedbackForStory,
  getLaqFeedbackForStory,
} from "@/server/utils/storyAssistant";

// ==================== Types ====================

export interface SubmitMCQuizRequest {
  chapterId: string;
  responses: any[];
  score: number;
  timer: number;
}

export interface SubmitSAQRequest {
  chapterId: string;
  question: string;
  answer: string;
  score: number;
  feedback: string;
  timer: number;
}

export interface SubmitLAQRequest {
  chapterId: string;
  question: string;
  answer: string;
  score: number;
  feedback: any;
  timer: number;
}

export interface GetFeedbackRequest {
  chapterId: string;
  question: string;
  answer: string;
  suggestedResponse?: string;
  preferredLanguage: string;
}

export interface RetakeQuizRequest {
  chapterId: string;
}

// ==================== MC Quiz Controllers ====================

/**
 * Submit MC Quiz
 */
export async function submitMCQuizController(
  req: NextRequest,
  user: AuthenticatedUser,
) {
  const body = (await req.json()) as SubmitMCQuizRequest;
  const { chapterId, responses, score, timer } = body;

  // Validation
  if (!chapterId) {
    return { error: "Chapter ID is required", status: 400 };
  }

  if (score === undefined || score === null) {
    return { error: "Score is required", status: 400 };
  }

  try {
    const result = await submitQuizModel({
      userId: user.id as string,
      chapterId,
      responses,
      score,
      timer,
      activityType: ActivityType.STORIES_MC_QUESTION,
    });

    return { data: result, status: 200 };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("already completed")) {
        return { error: error.message, status: 400 };
      }
      if (error.message.includes("not found")) {
        return { error: error.message, status: 404 };
      }
    }
    throw error;
  }
}

/**
 * Retake MC Quiz
 */
export async function retakeMCQuizController(
  req: NextRequest,
  user: AuthenticatedUser,
) {
  const body = (await req.json()) as RetakeQuizRequest;
  const { chapterId } = body;

  if (!chapterId) {
    return { error: "Chapter ID is required", status: 400 };
  }

  try {
    const result = await retakeMCQuizModel({
      userId: user.id as string,
      chapterId,
      activityType: ActivityType.STORIES_MC_QUESTION,
    });

    return { data: result, status: 200 };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return { error: error.message, status: 404 };
      }
    }
    throw error;
  }
}

// ==================== SAQ Controllers ====================

/**
 * Submit SAQ Quiz
 */
export async function submitSAQController(
  req: NextRequest,
  user: AuthenticatedUser,
) {
  const body = (await req.json()) as SubmitSAQRequest;
  const { chapterId, question, answer, score, feedback, timer } = body;

  // Validation
  if (!chapterId) {
    return { error: "Chapter ID is required", status: 400 };
  }

  if (score === undefined || score === null) {
    return { error: "Score is required", status: 400 };
  }

  // Check if already completed
  const existingActivity = await getExistingQuizActivity(
    user.id as string,
    chapterId,
    ActivityType.STORIES_SA_QUESTION,
  );

  if (existingActivity) {
    return { error: "SAQ already completed for this chapter", status: 400 };
  }

  try {
    const result = await submitQuizModel({
      userId: user.id as string,
      chapterId,
      responses: [{ question, answer, score, feedback }],
      score,
      timer,
      activityType: ActivityType.STORIES_SA_QUESTION,
    });

    return { data: result, status: 200 };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return { error: error.message, status: 404 };
      }
    }
    throw error;
  }
}

/**
 * Get SAQ Feedback from AI
 */
export async function getSAQFeedbackController(
  req: NextRequest,
  user: AuthenticatedUser,
) {
  const body = (await req.json()) as GetFeedbackRequest;
  const { chapterId, question, answer, suggestedResponse, preferredLanguage } =
    body;

  // Validation
  if (!chapterId || !question || !answer) {
    return {
      error: "Chapter ID, question, and answer are required",
      status: 400,
    };
  }

  try {
    // Get chapter data for context
    const chapter = await getChapterForFeedback(chapterId);
    if (!chapter) {
      return { error: "Chapter not found", status: 404 };
    }

    const feedback = await getSaqFeedbackForStory({
      chapterId,
      chapterContent: chapter.passage ?? "",
      cefrLevel: chapter.story?.cefrLevel ?? "A1",
      question,
      answer,
      suggestedResponse,
      preferredLanguage: preferredLanguage || "English",
    });

    return { data: feedback, status: 200 };
  } catch (error) {
    console.error("Error getting SAQ feedback:", error);
    throw error;
  }
}

// ==================== LAQ Controllers ====================

/**
 * Submit LAQ Quiz
 */
export async function submitLAQController(
  req: NextRequest,
  user: AuthenticatedUser,
) {
  const body = (await req.json()) as SubmitLAQRequest;
  const { chapterId, question, answer, score, feedback, timer } = body;

  // Validation
  if (!chapterId) {
    return { error: "Chapter ID is required", status: 400 };
  }

  if (score === undefined || score === null) {
    return { error: "Score is required", status: 400 };
  }

  // Check if already completed
  const existingActivity = await getExistingQuizActivity(
    user.id as string,
    chapterId,
    ActivityType.STORIES_LA_QUESTION,
  );

  if (existingActivity) {
    return { error: "LAQ already completed for this chapter", status: 400 };
  }

  try {
    const result = await submitQuizModel({
      userId: user.id as string,
      chapterId,
      responses: [{ question, answer, score, feedback }],
      score,
      timer,
      activityType: ActivityType.STORIES_LA_QUESTION,
    });

    return { data: result, status: 200 };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return { error: error.message, status: 404 };
      }
    }
    throw error;
  }
}

/**
 * Get LAQ Feedback from AI
 */
export async function getLAQFeedbackController(
  req: NextRequest,
  user: AuthenticatedUser,
) {
  const body = (await req.json()) as GetFeedbackRequest;
  const { chapterId, question, answer, preferredLanguage } = body;

  // Validation
  if (!chapterId || !question || !answer) {
    return {
      error: "Chapter ID, question, and answer are required",
      status: 400,
    };
  }

  try {
    // Get chapter data for context
    const chapter = await getChapterForFeedback(chapterId);
    if (!chapter) {
      return { error: "Chapter not found", status: 404 };
    }

    const feedback = await getLaqFeedbackForStory({
      chapterId,
      chapterContent: chapter.passage ?? "",
      cefrLevel: chapter.story?.cefrLevel ?? "A1",
      question,
      answer,
      preferredLanguage: preferredLanguage || "English",
    });

    return { data: feedback, status: 200 };
  } catch (error) {
    console.error("Error getting LAQ feedback:", error);
    throw error;
  }
}
