import { laquestion_system, saqeution_system } from "@/data/prompts-ai";
import { prisma } from "@/lib/prisma";
import {
  laqFeedbackInputSchema,
  laqFeedbackOutputSchema,
  saqFeedbackInputSchema,
  saqFeedbackOutputSchema,
} from "@/lib/zod";
import { LAQFeedback, LAQFeedbackResponse, SAQFeedbackResponse } from "@/types";
import { ActivityType } from "@/types/enum";
import { resolveTaskModel, formatTaskLog } from "@/server/ai/modelResolver";
import { TASK_KEYS } from "@/server/ai/taskKeys";
import { generateText, Output } from "ai";
import fs from "fs";
import path from "path";

export async function getSaqFeedback(req: {
  data: {
    articleId: string;
    question: string;
    answer: string;
    suggestedResponse?: string;
    preferredLanguage: string;
  };
  activityType: ActivityType;
}): Promise<SAQFeedbackResponse> {
  try {
    let prompt: string | undefined;

    const article = await prisma.article.findUnique({
      where: {
        id: req.data.articleId,
      },
      select: {
        passage: true,
        cefrLevel: true,
      },
    });

    if (!article) {
      throw new Error("Article not found");
    }

    const rawPrompt = fs.readFileSync(
      path.join(process.cwd(), "data", "prompts-feedback-user-SA.json"),
      "utf-8",
    );

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

    const {
      model: saqModel,
      modelId: saqModelId,
      providerName: saqProviderName,
      temperature: saqTemperature,
    } = await resolveTaskModel(TASK_KEYS.QA_FEEDBACK);
    console.log(
      formatTaskLog({
        taskKey: TASK_KEYS.QA_FEEDBACK,
        modelId: saqModelId,
        providerName: saqProviderName,
      }),
    );

    const { output: object } = await generateText({
      model: saqModel,
      temperature: saqTemperature,
      output: Output.object({ schema: saqFeedbackOutputSchema }),
      system: saqeution_system,
      prompt,
    });

    return object as SAQFeedbackResponse;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getLaqFeedback(req: {
  data: {
    articleId: string;
    question: string;
    answer: string;
    suggestedResponse?: string;
    preferredLanguage: string;
  };
}) {
  try {
    let prompt: string | undefined;

    const article = await prisma.article.findUnique({
      where: {
        id: req.data.articleId,
      },
      select: {
        passage: true,
        cefrLevel: true,
      },
    });

    if (!article) {
      throw new Error("Article not found");
    }

    const rawPrompt = fs.readFileSync(
      path.join(process.cwd(), "data", "prompts-feedback-user-LA.json"),
      "utf-8",
    );

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

    const {
      model: laqModel,
      modelId: laqModelId,
      providerName: laqProviderName,
      temperature: laqTemperature,
    } = await resolveTaskModel(TASK_KEYS.QA_FEEDBACK);
    console.log(
      formatTaskLog({
        taskKey: TASK_KEYS.QA_FEEDBACK,
        modelId: laqModelId,
        providerName: laqProviderName,
      }),
    );

    const { output: object } = await generateText({
      model: laqModel,
      temperature: laqTemperature,
      output: Output.object({ schema: laqFeedbackOutputSchema }),
      system: laquestion_system,
      prompt,
    });

    if (!object.feedback) {
      return { error: "An error occurred" };
    } else {
      return object.feedback;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}
