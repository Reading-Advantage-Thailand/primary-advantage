import { laquestion_system, saqeution_system } from "@/data/prompts-ai";
import { prisma } from "@/lib/prisma";
import {
  laqFeedbackInputSchema,
  laqFeedbackOutputSchema,
  saqFeedbackInputSchema,
  saqFeedbackOutputSchema,
} from "@/lib/zod";
import { SAQFeedbackResponse } from "@/types";
import { LAQFeedbackResponse } from "@/types";
import { ActivityType } from "@/types/enum";
import { google, googleModel } from "@/utils/google";
import { generateObject } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";

export async function getQuestionFeedback(req: {
  data: {
    articleId: string;
    question: string;
    answer: string;
    suggestedResponse?: string;
    preferredLanguage: string;
  };
  activityType: ActivityType;
}): Promise<SAQFeedbackResponse | LAQFeedbackResponse> {
  try {
    let outputSchema;
    let systemPrompt;
    let prompt;

    const article = await prisma.article.findUnique({
      where: {
        id: req.data.articleId,
      },
      select: {
        passage: true,
        cefrLevel: true,
      },
    });

    if (req.activityType === ActivityType.SA_QUESTION) {
      const rawPrompt = fs.readFileSync(
        path.join(process.cwd(), "data", "prompts-feedback-user-SA.json"),
        "utf-8"
      );
      outputSchema = saqFeedbackOutputSchema;
      systemPrompt = saqeution_system;

      const data = {
        preferredLanguage: req.data.preferredLanguage,
        targetCEFRLevel: article?.cefrLevel.replace(/[+-]/g, ""),
        article: article?.passage,
        question: req.data.question,
        suggestedResponse: req.data.suggestedResponse,
        studentResponse: req.data.answer,
      };

      const validatedInput = saqFeedbackInputSchema.parse(data);

      prompt = rawPrompt
        .replace("{preferredLanguage}", validatedInput.preferredLanguage)
        .replace("{targetCEFRLevel}", validatedInput.targetCEFRLevel)
        .replace("{article}", validatedInput.article)
        .replace("{question}", validatedInput.question)
        .replace("{suggestedResponse}", validatedInput.suggestedResponse)
        .replace("{studentResponse}", validatedInput.studentResponse);
    } else if (req.activityType === ActivityType.LA_QUESTION) {
      const rawPrompt = fs.readFileSync(
        path.join(process.cwd(), "data", "prompts-feedback-user-LA.json"),
        "utf-8"
      );
      outputSchema = laqFeedbackOutputSchema;
      systemPrompt = laquestion_system;

      const data = {
        preferredLanguage: req.data.preferredLanguage,
        targetCEFRLevel: article?.cefrLevel.replace(/[+-]/g, ""),
        readingPassage: article?.passage,
        writingPrompt: req.data.question,
        studentResponse: req.data.answer,
      };

      const validatedInput = laqFeedbackInputSchema.parse(data);

      prompt = rawPrompt
        .replace("{preferredLanguage}", validatedInput.preferredLanguage)
        .replace("{targetCEFRLevel}", validatedInput.targetCEFRLevel)
        .replace("{readingPassage}", validatedInput.readingPassage)
        .replace("{writingPrompt}", validatedInput.writingPrompt)
        .replace("{studentResponse}", validatedInput.studentResponse);
    }

    const { object } = await generateObject({
      model: google(googleModel),
      schema: outputSchema as z.ZodSchema,
      system: systemPrompt,
      prompt,
    });

    return object;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
