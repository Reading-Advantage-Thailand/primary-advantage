import path from "path";
import fs from "fs";
import { generateText, Output } from "ai";
import { resolveTaskModel, formatTaskLog } from "@/server/ai/modelResolver";
import { TASK_KEYS } from "@/server/ai/taskKeys";
import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import { articleGeneratorSchema } from "@/lib/zod";

export interface GenerateArticleParams {
  type: ArticleType;
  genre: string;
  subgenre: string;
  topic: string;
  cefrLevel: ArticleBaseCefrLevel;
  previousContent?: string;
}

export interface GenerateArticleResponse {
  passage: string;
  title: string;
  summary: string;
  imageDesc: string;
  translatedSummary: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
}

type CefrLevelPromptType = {
  type: ArticleType;
  levels: CefrLevelType[];
};

type CefrLevelType = {
  level: string;
  systemPrompt: string;
  modelId: string;
  userPromptTemplate: string;
};

export async function generateArticle(
  params: GenerateArticleParams,
): Promise<GenerateArticleResponse> {
  const dataFilePath = path.join(
    process.cwd(),
    "data",
    "cefr-article-prompts.json",
  );

  // read prompts from file
  const rawData = fs.readFileSync(dataFilePath, "utf-8");
  const prompts: CefrLevelPromptType[] = JSON.parse(rawData);

  // find the level config
  const levelConfig = prompts
    .find((item) => item.type === params.type)
    ?.levels.find((lvl) => lvl.level === params.cefrLevel);

  if (!levelConfig) {
    throw new Error(`level config not found for ${params.cefrLevel}`);
  }

  const userPrompt = levelConfig.userPromptTemplate
    .replace("{genre}", params.genre)
    .replace("{subgenre}", params.subgenre)
    .replace("{topic}", params.topic);

  // generate article
  try {
    const { model, modelId, providerName, temperature } = await resolveTaskModel(
      TASK_KEYS.ARTICLE_GENERATE,
    );

    console.log(
      `${params.cefrLevel} generating article | ${formatTaskLog({ taskKey: TASK_KEYS.ARTICLE_GENERATE, modelId, providerName })} | type: ${params.type}`,
    );

    const { output: article } = await generateText({
      model,
      output: Output.object({ schema: articleGeneratorSchema }),
      system: levelConfig.systemPrompt,
      prompt: userPrompt,
      seed: Math.floor(Math.random() * 1000),
      temperature: temperature,
    });

    return article;
  } catch (error) {
    throw `failed to generate article: ${error}`;
  }
}
