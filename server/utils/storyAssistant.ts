import { laquestion_system, saqeution_system } from "@/data/prompts-ai";
import {
  laqFeedbackInputSchema,
  laqFeedbackOutputSchema,
  saqFeedbackInputSchema,
  saqFeedbackOutputSchema,
} from "@/lib/zod";
import { LAQFeedbackResponse, SAQFeedbackResponse } from "@/types";
import { google, googleModel } from "@/utils/google";
import { generateText, Output } from "ai";
import fs from "fs";
import path from "path";

// ==================== Types ====================

export interface StorySAQFeedbackParams {
  chapterId: string;
  chapterContent: string;
  cefrLevel: string;
  question: string;
  answer: string;
  suggestedResponse?: string;
  preferredLanguage: string;
}

export interface StoryLAQFeedbackParams {
  chapterId: string;
  chapterContent: string;
  cefrLevel: string;
  question: string;
  answer: string;
  preferredLanguage: string;
}

// ==================== SAQ Feedback ====================

/**
 * Get SAQ feedback for story chapter
 */
export async function getSaqFeedbackForStory(
  params: StorySAQFeedbackParams,
): Promise<SAQFeedbackResponse> {
  const {
    chapterContent,
    cefrLevel,
    question,
    answer,
    suggestedResponse,
    preferredLanguage,
  } = params;

  try {
    const rawPrompt = fs.readFileSync(
      path.join(process.cwd(), "data", "prompts-feedback-user-SA.json"),
      "utf-8",
    );

    const data = {
      preferredLanguage,
      targetCEFRLevel: cefrLevel.replace(/[+-]/g, ""),
      article: chapterContent,
      question,
      suggestedResponse: suggestedResponse || "",
      studentResponse: answer,
    };

    const validatedInput = saqFeedbackInputSchema.parse(data);

    const prompt = rawPrompt
      .replace("{preferredLanguage}", validatedInput.preferredLanguage)
      .replace("{targetCEFRLevel}", validatedInput.targetCEFRLevel)
      .replace("{article}", validatedInput.article)
      .replace("{question}", validatedInput.question)
      .replace("{suggestedResponse}", validatedInput.suggestedResponse)
      .replace("{studentResponse}", validatedInput.studentResponse);

    const { output: object } = await generateText({
      model: google(googleModel),
      output: Output.object({ schema: saqFeedbackOutputSchema }),
      system: saqeution_system,
      prompt,
    });

    return object as SAQFeedbackResponse;
  } catch (error) {
    console.error("Error getting SAQ feedback for story:", error);
    throw error;
  }
}

// ==================== LAQ Feedback ====================

/**
 * Get LAQ feedback for story chapter
 */
export async function getLaqFeedbackForStory(
  params: StoryLAQFeedbackParams,
): Promise<LAQFeedbackResponse | { error: string }> {
  const { chapterContent, cefrLevel, question, answer, preferredLanguage } =
    params;

  try {
    const rawPrompt = fs.readFileSync(
      path.join(process.cwd(), "data", "prompts-feedback-user-LA.json"),
      "utf-8",
    );

    const data = {
      preferredLanguage,
      targetCEFRLevel: cefrLevel.replace(/[+-]/g, ""),
      readingPassage: chapterContent,
      writingPrompt: question,
      studentResponse: answer,
    };

    const validatedInput = laqFeedbackInputSchema.parse(data);

    const prompt = rawPrompt
      .replace("{preferredLanguage}", validatedInput.preferredLanguage)
      .replace("{targetCEFRLevel}", validatedInput.targetCEFRLevel)
      .replace("{readingPassage}", validatedInput.readingPassage)
      .replace("{writingPrompt}", validatedInput.writingPrompt)
      .replace("{studentResponse}", validatedInput.studentResponse);

    const { output: object } = await generateText({
      model: google(googleModel),
      output: Output.object({ schema: laqFeedbackOutputSchema }),
      system: laquestion_system,
      prompt,
    });

    if (!object.feedback) {
      return { error: "An error occurred" };
    }

    // Return the feedback object directly (matches AI output structure)
    return object.feedback as unknown as LAQFeedbackResponse;
  } catch (error) {
    console.error("Error getting LAQ feedback for story:", error);
    throw error;
  }
}
