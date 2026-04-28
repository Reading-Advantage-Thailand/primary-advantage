import { NEW_EVALUATE_RATING_SYSTEM_PROMPT } from "@/data/prompts-ai";
import {
  ArticleBaseCefrLevel,
  ArticleCefrLevel,
  ArticleType,
} from "@/types/enum";
import { google, googleModel } from "@/utils/google";
import { generateText, Output } from "ai";
import { z } from "zod";

export interface EvaluateRatingParams {
  type?: ArticleType;
  genre?: string;
  subgenre?: string;
  cefrLevel?: ArticleBaseCefrLevel | ArticleCefrLevel;
  title?: string;
  summary?: string;
  passage: string;
  image_description?: string;
}

export interface EvaluateRatingResponse {
  rating: number;
  cefrLevel?: string;
}

interface CefrLevelEvaluationPromptType {
  level: string;
  systemPrompt: string;
}

export async function evaluateRating(
  params: EvaluateRatingParams,
): Promise<EvaluateRatingResponse> {
  // const dataFilePath = path.join(
  //   process.cwd(),
  //   "data",
  //   "new-level-evaluation-prompts.json",
  // );

  // read prompts from file
  // const rawData = fs.readFileSync(dataFilePath, "utf-8");
  // const prompt: CefrLevelEvaluationPromptType[] = JSON.parse(rawData);

  // const systemPrompt = prompt.find(
  //   (p) => p.level === params.cefrLevel,
  // )?.systemPrompt;

  try {
    const { output: evaluated } = await generateText({
      model: google(googleModel),
      output: Output.object({
        schema: z.object({
          reasoning: z.string(),
          cefrLevel: z.string(),
          rating: z.number(),
        }),
      }),
      system: NEW_EVALUATE_RATING_SYSTEM_PROMPT,
      prompt: `Please evaluate the following text. The expected baseline CEFR level for the target audience is: ${params.cefrLevel}
      Article:
      """
      ${params.passage}
      """
      Remember to return ONLY a valid JSON object as instructed.`,
      seed: Math.floor(Math.random() * 1000),
      temperature: 1,
      maxOutputTokens: 4096,
    });

    return {
      rating: evaluated.rating,
      cefrLevel: evaluated.cefrLevel,
    };
  } catch (error) {
    throw `failed to evaluate rating`;
  }
}
