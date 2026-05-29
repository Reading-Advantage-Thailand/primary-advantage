import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import { MCQuestionSchema } from "@/lib/zod";
import { generateQuestion, GenerateQuestionParams } from "./question-generator";

interface GenrateMCQuestionParams {
  cefrlevel: ArticleBaseCefrLevel;
  type: ArticleType;
  passage: string;
  title: string;
  summary: string;
  imageDesc: string;
}

interface GenerateMCQuestionResponse {
  questions: {
    question_number: number;
    question: string;
    answer: string;
    options: string[];
    textual_evidence: string;
  }[];
}

/**
 * Generates multiple choice questions for an article using AI.
 * @param params - Question generation parameters including CEFR level, article type, passage, title, summary, and image description
 */
export async function generateMCQuestion(
  params: GenrateMCQuestionParams
): Promise<GenerateMCQuestionResponse> {
  // generate question params
  const generateParams: GenerateQuestionParams<GenerateMCQuestionResponse> = {
    type: params.type,
    passage: params.passage,
    title: params.title,
    summary: params.summary,
    imageDesc: params.imageDesc,
    schema: MCQuestionSchema,
    promptFile: "prompts-combined-MC.json",
    cefrlevel: params.cefrlevel,
  };
  // generate question
  const generateQuestionResponse =
    await generateQuestion<GenerateMCQuestionResponse>(generateParams);
  return generateQuestionResponse.question;
}
