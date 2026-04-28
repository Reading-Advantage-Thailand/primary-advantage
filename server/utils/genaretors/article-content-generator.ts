import { generateText, Output } from "ai";
import { google, googleModel } from "@/utils/google";
import { articleGeneratorSchema } from "@/lib/zod";
import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import path from "path";
import fs from "fs";
import { z } from "zod";

export type ArticleGeneratorResponse = z.infer<typeof articleGeneratorSchema>;

export interface GenerateArticleContentParams {
  cefrLevel: ArticleBaseCefrLevel;
  type: ArticleType;
  genre: string;
  topic: string;
}

// ─── Prompt Config Types ─────────────────────────────────────────────────────

type PromptLevel = {
  level: string;
  systemPrompt: string;
  userPromptTemplate: string;
};

type ArticlePromptsFile = { type: string; levels: PromptLevel[] }[];

// ─── Lazy-loaded prompt cache ────────────────────────────────────────────────

let cachedPrompts: ArticlePromptsFile | null = null;

function getPromptLevels(type: ArticleType): PromptLevel[] {
  if (!cachedPrompts) {
    const filePath = path.join(
      process.cwd(),
      "data",
      "new-article-prompts.json",
    );
    cachedPrompts = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return cachedPrompts!.find((entry) => entry.type === type)?.levels ?? [];
}

// ─── Main Generator ──────────────────────────────────────────────────────────

export async function generateArticleContent(
  params: GenerateArticleContentParams,
): Promise<ArticleGeneratorResponse> {
  const { cefrLevel, type, genre, topic } = params;

  const levels = getPromptLevels(type);
  const levelConfig = levels.find((l) => l.level === cefrLevel);
  if (!levelConfig) {
    throw new Error(`Prompt not found for ${type}/${cefrLevel}`);
  }

  const getRandomSubLevel = (baseLevel: string): string => {
    const modifiers = ["-", "", "+"];
    const randomIndex = Math.floor(Math.random() * modifiers.length);
    return `${baseLevel}${modifiers[randomIndex]}`;
  };

  const subLevel = getRandomSubLevel(cefrLevel);

  const systemPrompt = levelConfig.systemPrompt;
  const userPrompt = levelConfig.userPromptTemplate
    .replace("{genre}", genre)
    .replace("{topic}", topic);

  const { output } = await generateText({
    model: google(googleModel),
    output: Output.object({ schema: articleGeneratorSchema }),
    system: systemPrompt,
    prompt: `
    ${userPrompt}

    Write a story at level ${cefrLevel} with complexity ${subLevel}.
    RULES for ${subLevel}:
    - If sub_level is '-': 
        1. Use ONLY 'is/am/are'. 
        2. Use a maximum of 5 unique nouns in the whole story (e.g., only 'cat', 'mat', 'hat', 'rat'). 
        3. No compound nouns like 'lunch box' (use 'box' instead). 
        4. Repeat the same sentences with minor changes.
    - If sub_level is '+': 
        1. You can add 1-2 adjectives (happy, red). 
        2. You can use 'has' or simple action verbs.`,
    temperature: 0.8,
  });

  return output;
}
