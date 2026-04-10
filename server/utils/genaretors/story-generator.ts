import { generateText, Output, generateImage } from "ai";
import {
  google,
  googleImage,
  googleModel,
  googleModelPro,
  googleImageModel,
} from "@/utils/google";
import { openai, newModel } from "@/utils/openai";
import { storyGeneratorSchema } from "@/lib/zod";
import { z } from "zod";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { createLogFile } from "../logging";
import sharp from "sharp";
import { uploadToBucket } from "@/utils/storage";

export interface GenerateStoryParams {
  cefrLevel: string;
  genre: string;
  topic: string;
}

type CefrLevelPromptType = {
  levels: CefrLevelType[];
};

type CefrLevelType = {
  level: string;
  systemPrompt: string;
  modelId: string;
  userPromptTemplate: string;
};

export type GenerateStoryResponse = z.infer<typeof storyGeneratorSchema>;

const aiModel = googleModelPro;

// Cache prompt file in memory (lazy-loaded singleton)
let cachedPrompts: CefrLevelPromptType | null = null;

function getStoryPrompts(): CefrLevelPromptType {
  if (!cachedPrompts) {
    const dataFilePath = path.join(
      process.cwd(),
      "data",
      "storie-prompts.json",
    );
    const rawData = fs.readFileSync(dataFilePath, "utf-8");
    cachedPrompts = JSON.parse(rawData);
  }
  return cachedPrompts!;
}

export async function generateStoryContent(
  params: GenerateStoryParams,
): Promise<GenerateStoryResponse> {
  try {
    console.log(`${params.cefrLevel} generating story model ID: ${aiModel}`);

    const prompts = getStoryPrompts();

    const levelConfig = prompts?.levels.find(
      (lvl: CefrLevelType) => lvl.level === params.cefrLevel,
    );

    if (!levelConfig) {
      throw new Error(`level config not found for ${params.cefrLevel}`);
    }

    const userPrompt = levelConfig.userPromptTemplate
      .replace("{genre}", params?.genre)
      .replace("{topic}", params?.topic);

    const { output: story } = await generateText({
      model: google(aiModel),
      // model: openai(aiModel),
      output: Output.object({ schema: storyGeneratorSchema }),
      system: levelConfig.systemPrompt,
      prompt: userPrompt,
      // seed: Math.floor(Math.random() * 1000),
      temperature: 0.7,
    });

    return story;
  } catch (error) {
    console.error("Error generating story:", error);
    throw new Error(`Failed to generate story: ${error}`);
  }
}

export const generateStoryTopic = async (
  genre: string,
  amountPerGenre: number,
) => {
  const prompts = `Please provide ${amountPerGenre} reading passage topics in the fiction ${genre} genre and appropriate for secondary school students. 
    ### Requirements:
  - **Only return the book title** (no explanations, no descriptions, no genre labels).
  - **Do NOT return general genre labels like 'Fantasy YA', 'Science Fiction', 'Mystery Thriller'**.
  - **Do NOT include the words 'fiction', 'genre', or any similar category names.**
  - **Each title must sound like a real book title.**
  - **Keep each title short (maximum 8 words).**
  - **Output must be a JSON array of strings ONLY.**
  Output as a JSON array.`;
  try {
    const { output } = await generateText({
      model: google(aiModel),
      // model: openai(aiModel),
      output: Output.object({
        schema: z.object({
          topics: z
            .array(z.string())
            .describe("An array of topics")
            .length(amountPerGenre),
        }),
      }),
      prompt: prompts,
    });

    return {
      topics: output.topics,
    };
  } catch (error) {
    throw new Error(`Failed to generate topic: ${error}`);
  }
};

// ---------------------------------------------------------------------------
// Evaluation — linguistic criteria per CEFR level (for proficiency assessment)
// ---------------------------------------------------------------------------

const CEFR_LINGUISTIC_CRITERIA: Record<string, string> = {
  A0: "CEFR A0 (Starters): vocabulary limited to basic concrete words (colors, animals, family, toys, numbers 1-10); grammar restricted to present simple ('is', 'has', 'likes') — no past tense; sentences extremely short (3-5 words); no complex structures.",
  A1: "CEFR A1 (Movers): everyday vocabulary (places, weather, school, time, health); past simple ('went', 'saw'), basic connectors ('and', 'but', 'so'), simple modals ('can', 'must'); sentences 5-7 words; no conditionals or perfect tenses.",
  A2: "CEFR A2 (Flyers): common vocabulary with some new topic-specific words; past continuous ('was running'), future ('will', 'going to'), relative clauses ('who', 'which'), comparative adjectives; sentences 6-8 words; simple compound sentences.",
  B1: "CEFR B1 (KET): varied everyday vocabulary; present perfect (simple usage), passive voice (simple forms), first conditional ('if...will'), modals ('should', 'have to'); sentences 8-10 words with paragraph structure and varied beginnings.",
  B2: "CEFR B2 (PET): wider vocabulary including some expressions and idioms; second conditional, past perfect, complex passive, reported speech; sentences 10-12 words with varied structure; multiple perspectives and abstract ideas handled clearly.",
};

export const evaluateStoryContent = async (
  chapters: string[],
  cefrLevel: string,
) => {
  const linguisticCriteria = CEFR_LINGUISTIC_CRITERIA[cefrLevel];

  if (!linguisticCriteria) {
    throw new Error(`No evaluation criteria configured for CEFR level: ${cefrLevel}`);
  }

  const systemPrompt = `You are a dual-role evaluator: a children's literacy expert AND a language proficiency assessor for elementary students (grades 3-6).

You will evaluate story chapters on TWO completely independent dimensions. Do NOT let one influence the other.

---
DIMENSION 1 — LINGUISTIC PROFICIENCY (cefrLevel)
Assess whether the vocabulary, grammar, and sentence structure match the target level.
Target level criteria: ${linguisticCriteria}
Output the assessed level as the base level with an optional modifier:
- Exact match → "${cefrLevel}"
- Slightly above (a few words/structures above threshold) → "${cefrLevel}+"
- Slightly below (notably simpler than expected) → "${cefrLevel}-"
Do NOT output a different base level (e.g. if target is ${cefrLevel}, never output ${cefrLevel === "A1" ? "A0 or A2" : "a completely different level"}).

---
DIMENSION 2 — CONTENT QUALITY (rating)
Assess the story's quality as children's fiction, independent of language difficulty.
Criteria:
- Story coherence: does the plot flow logically with clear cause and effect?
- Character appeal: are characters interesting, relatable, and distinct?
- Age-appropriateness: are themes and situations suitable for grades 3-6?
- Vocabulary integration: are new words introduced naturally in context?
- Reader engagement: does each chapter end with curiosity or a hook?

Rating scale (1-5):
1 = Poor — incoherent plot, flat characters, or inappropriate themes
2 = Weak — story functions but lacks engagement or has notable structural issues
3 = Acceptable — children could follow and somewhat enjoy it
4 = Good — engaging story with appealing characters and clear plot progression
5 = Excellent — captivating, would motivate a child to keep reading`;

  const userPrompt = `Evaluate the following story chapters on the two independent dimensions described in your instructions.

### Story Chapters:
${chapters.join("\n\n---\n\n")}

Assess:
1. cefrLevel: does the text linguistically match ${cefrLevel}? (output "${cefrLevel}", "${cefrLevel}+", or "${cefrLevel}-" only)
2. rating: how good is the story as children's fiction? (integer 1-5, based solely on quality — not difficulty)

Return a JSON object with keys 'cefrLevel' (string) and 'rating' (integer 1-5).`;

  try {
    const { output: evaluation } = await generateText({
      model: google(aiModel),
      output: Output.object({
        schema: z.object({
          cefrLevel: z
            .string()
            .describe(
              `Assessed CEFR proficiency level. Must be '${cefrLevel}', '${cefrLevel}+', or '${cefrLevel}-'.`,
            ),
          rating: z
            .number()
            .int()
            .min(1)
            .max(5)
            .describe("Content quality rating 1-5, independent of language difficulty."),
        }),
      }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
    });

    return evaluation;
  } catch (error) {
    throw new Error(`Failed to evaluate story content: ${error}`);
  }
};

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;
const CONCURRENCY_LIMIT = 5;
const IMAGES_DIR = path.join(process.cwd(), "data/images");

interface StoryImageResult {
  success: boolean;
  imageUrls: string[];
  error?: string;
}

interface SingleImageResult {
  index: number;
  url: string | null;
  error: string | null;
  tempFile: string | null;
}

// Helper: Format Character Description
const formatCharacterDescription = (
  characters: Record<string, string>[],
): string => {
  return characters
    .map((char) =>
      Object.entries(char)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", "),
    )
    .join("\n");
};

// Helper: Construct Prompt
const constructPrompt = (sceneDesc: string, charDesc: string): string => {
  return `
    STYLE REQUIREMENTS (MUST BE CONSISTENT):
    - Art style: Bright, colorful cartoon illustration in children's storybook style
    - Character design: Keep exact same character features, proportions, and colors
    - Color palette: Consistent warm, vibrant colors
    - Line style: Clean, smooth outlines with soft shading
    - Background: Simple, colorful backgrounds

    CHARACTER (MUST LOOK IDENTICAL):
    ${charDesc}

    Create ONE illustration for a children's storybook.
    Scene: ${sceneDesc}

    IMPORTANT AND MUST FOLLOW:
    - Don't have text or description in the image.
    - Don't have multiple same characters in one image.
    - The character must look exactly as described above. 
    - Generate exactly 1 image.
  `;
};

// ★ Helper: Core Logic — generate and upload are separate retry phases
const processSingleImage = async (
  index: number,
  scene: Record<string, string>,
  charDesc: string,
): Promise<SingleImageResult> => {
  const imageLabel = index === 0 ? "Cover" : `${index}`;
  const localPath = path.join(IMAGES_DIR, `${scene.id}.png`);
  const cloudPath = `images/story/${scene.id}.png`;

  // ── Phase 1: Generate + write to disk (retry on AI/write failure) ──
  let generateAttempts = 0;
  let generated = false;

  while (generateAttempts < MAX_RETRIES && !generated) {
    try {
      const { images } = await generateImage({
        model: google.image(googleImageModel),
        prompt: constructPrompt(scene.description, charDesc),
        aspectRatio: "4:3",
        n: 1,
      });

      const base64Image = Buffer.from(images[0].base64, "base64");
      await fsPromises.writeFile(localPath, base64Image);
      generated = true;
    } catch (error) {
      generateAttempts++;
      if (generateAttempts >= MAX_RETRIES) {
        return {
          index,
          url: null,
          error: `Image generation failed for ${imageLabel} after ${MAX_RETRIES} attempts: ${error}`,
          tempFile: null,
        };
      }
      const delay = Math.pow(2, generateAttempts) * RETRY_DELAY_BASE;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // ── Phase 2: Upload from the saved file (retry without re-generating) ──
  let uploadAttempts = 0;

  while (uploadAttempts < MAX_RETRIES) {
    try {
      await uploadToBucket(localPath, cloudPath);
      return { index, url: cloudPath, error: null, tempFile: localPath };
    } catch (error) {
      uploadAttempts++;
      if (uploadAttempts >= MAX_RETRIES) {
        return {
          index,
          url: null,
          error: `Image upload failed for ${imageLabel} after ${MAX_RETRIES} attempts: ${error}`,
          tempFile: localPath,
        };
      }
      const delay = Math.pow(2, uploadAttempts) * RETRY_DELAY_BASE;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { index, url: null, error: "Unknown error", tempFile: localPath };
};

// ★ Main Function
export const generateStoryImage = async (
  characters: Record<string, string>[],
  imagesDesc: Record<string, string>[],
): Promise<StoryImageResult> => {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const charDesc = formatCharacterDescription(characters);
  const allTempFiles: string[] = [];
  const finalUrls: string[] = new Array(imagesDesc.length).fill("");
  const errorDetails: string[] = [];

  // Counters
  let successCount = 0;
  let failCount = 0;

  try {
    for (let i = 0; i < imagesDesc.length; i += CONCURRENCY_LIMIT) {
      const batch = imagesDesc.slice(i, i + CONCURRENCY_LIMIT);

      // สร้าง Promise แต่ไม่ต้อง Log ว่าเริ่ม Batch ไหน
      const promiseBatch = batch.map((scene, batchIndex) => {
        const globalIndex = i + batchIndex;
        return processSingleImage(globalIndex, scene, charDesc);
      });

      const results = await Promise.all(promiseBatch);

      for (const res of results) {
        if (res.tempFile) allTempFiles.push(res.tempFile);

        if (res.error || !res.url) {
          failCount++;
          errorDetails.push(res.error || `Unknown error at index ${res.index}`);
        } else {
          successCount++;
          finalUrls[res.index] = res.url;
        }
      }
    }

    if (failCount > 0) {
      // createLogFile(imagesDesc[0].id, errorDetails, "error");
      return {
        success: false,
        error: `Generated ${successCount}/${imagesDesc.length} images. Failures: ${failCount}`,
        imageUrls: finalUrls.filter((u) => u !== ""),
      };
    }

    return {
      success: true,
      imageUrls: finalUrls,
    };
  } finally {
    // Cleanup แบบเงียบๆ
    for (const file of allTempFiles) {
      try {
        await fsPromises.unlink(file);
      } catch (e) {}
    }
  }
};
