import { generateText, Output, generateImage } from "ai";
import {
  google,
  googleImage,
  googleModel,
  googleNewModel,
  googleImageModel,
} from "@/utils/google";
import { openai, newModel } from "@/utils/openai";
import { storyGeneratorSchema } from "@/lib/zod";
import { z } from "zod";
import path from "path";
import fs from "fs";
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

const aiModel = googleNewModel;

export async function generateStoryContent(
  params: GenerateStoryParams,
): Promise<GenerateStoryResponse> {
  try {
    console.log(`${params.cefrLevel} generating story model ID: ${aiModel}`);

    const dataFilePath = path.join(
      process.cwd(),
      "data",
      "storie-prompts.json",
    );

    // read prompts from file
    const rawData = fs.readFileSync(dataFilePath, "utf-8");
    const prompts: CefrLevelPromptType = JSON.parse(rawData);

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
  const prompts = `Please provide ${amountPerGenre} reading passage topics in the ${genre} genre and appropriate for secondary school students. 
    ### Requirements:
  - **Only return the book title** (no explanations, no descriptions, no genre labels).
  - **Do NOT return general genre labels like 'Fantasy YA', 'Science Fiction', 'Mystery Thriller'**.
  - **Do NOT include the words 'genre', or any similar category names.**
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

export const evaluateStoryContent = async (
  chapter: string[],
  cefrLevel: string,
) => {
  try {
    const rawPromptsPath = [
      {
        level: "A0",
        systemPrompt:
          "You are an expert in children's literacy and language assessment for elementary students (grades 3-6). Your task is to evaluate fiction and nonfiction articles for young language learners at the CEFR A0 level. A0 level requires:\n- Very basic vocabulary with familiar, everyday words children would know\n- Very short, simple sentences (4-5 words on average) that young readers can easily follow\n- Simple present tense and basic grammar that beginning readers can handle\n- Concrete, relatable topics about familiar things like family, pets, school, or toys\n- Colorful, engaging content with clear meaning for young readers\n\nDetermine if the article matches the CEFR A0 level for children. You may add a '+' or '-' to the level if it's slightly above or below standard (e.g., more than five difficult words or no difficult words for that level).\n\nProvide a star rating based on how engaging the content would be for young readers:\n1 star: Not appealing to children, too difficult, or inappropriate content\n2 stars: Somewhat interesting but misses the mark for young readers\n3 stars: Decent content that children could understand and somewhat enjoy\n4 stars: Engaging content that would interest most children in this age group\n5 stars: Excellent, highly engaging content that would captivate young readers\n\nConsider factors such as: child-friendly vocabulary, simple sentence structure, interesting characters or facts, colorful descriptions, relatable situations, and overall appeal to young readers.\n\nProvide your assessment as a JSON object with two keys: 'cefr_level' and 'star_rating'. The 'cefr_level' value should be a string representing the CEFR level (e.g., 'A0' ,'A0+','A0-'), and the 'star_rating' value should be an integer from 1 to 5.",
      },
      {
        level: "A1",
        systemPrompt:
          "You are an expert in children's literacy and language assessment for elementary students (grades 3-6). Your task is to evaluate fiction and nonfiction articles for young language learners at the CEFR A1 level. A1 level requires:\n- Very basic vocabulary with familiar, everyday words children would know\n- Very short, simple sentences (4-5 words on average) that young readers can easily follow\n- Simple present tense and basic grammar that beginning readers can handle\n- Concrete, relatable topics about familiar things like family, pets, school, or toys\n- Colorful, engaging content with clear meaning for young readers\n\nDetermine if the article matches the CEFR A1 level for children. You may add a '+' or '-' to the level if it's slightly above or below standard (e.g., more than five difficult words or no difficult words for that level).\n\nProvide a star rating based on how engaging the content would be for young readers:\n1 star: Not appealing to children, too difficult, or inappropriate content\n2 stars: Somewhat interesting but misses the mark for young readers\n3 stars: Decent content that children could understand and somewhat enjoy\n4 stars: Engaging content that would interest most children in this age group\n5 stars: Excellent, highly engaging content that would captivate young readers\n\nConsider factors such as: child-friendly vocabulary, simple sentence structure, interesting characters or facts, colorful descriptions, relatable situations, and overall appeal to young readers.\n\nProvide your assessment as a JSON object with two keys: 'cefr_level' and 'star_rating'. The 'cefr_level' value should be a string representing the CEFR level (e.g., 'A1' ,'A1+', 'A1-'), and the 'star_rating' value should be an integer from 1 to 5.",
      },
      {
        level: "A2",
        systemPrompt:
          "You are an expert in children's literacy and language assessment for elementary students (grades 3-6). Your task is to evaluate fiction and nonfiction articles for young language learners at the CEFR A2 level. A2 level requires:\n- Common, everyday vocabulary with some new words that elementary students can learn\n- Short, simple sentences (6-7 words on average) with basic joining words like 'and' and 'but'\n- Simple present and past tenses that young readers can follow\n- Familiar topics about school, friends, family, animals, or everyday adventures\n- Content that's interesting and relatable for children ages 8-10\n\nDetermine if the article matches the CEFR A2 level for children. You may add a '+' or '-' to the level if it's slightly above or below standard (e.g., more than five difficult words or no difficult words for that level).\n\nProvide a star rating based on how engaging the content would be for young readers:\n1 star: Not appealing to children, too difficult, or inappropriate content\n2 stars: Somewhat interesting but misses the mark for young readers\n3 stars: Decent content that children could understand and somewhat enjoy\n4 stars: Engaging content that would interest most children in this age group\n5 stars: Excellent, highly engaging content that would captivate young readers\n\nConsider factors such as: appropriate vocabulary for young readers, clear sentence structure, interesting characters or facts, colorful descriptions, relatable situations for children, and overall appeal to elementary students.\n\nProvide your assessment as a JSON object with two keys: 'cefr_level' and 'star_rating'. The 'cefr_level' value should be a string representing the CEFR level (e.g., 'A2' ,'A2+', 'A2-'), and the 'star_rating' value should be an integer from 1 to 5.",
      },
      {
        level: "B1",
        systemPrompt:
          "You are an expert in children's literacy and language assessment for elementary students (grades 3-6). Your task is to evaluate fiction and nonfiction articles for young language learners at the CEFR B1 level. B1 level requires:\n- A range of common words with some interesting vocabulary that upper elementary students would enjoy learning\n- Sentences of moderate length (8-10 words on average) with some variety in structure\n- A range of tenses and some complex structures that advanced young readers can follow\n- Topics that engage curious 9-11 year olds, with both concrete and some abstract ideas\n- Content that stimulates thinking while remaining appropriate for upper elementary readers\n\nDetermine if the article matches the CEFR B1 level for children. You may add a '+' or '-' to the level if it's slightly above or below standard (e.g., more than five difficult words or no difficult words for that level).\n\nProvide a star rating based on how engaging the content would be for young readers:\n1 star: Not appealing to children, too difficult, or inappropriate content\n2 stars: Somewhat interesting but misses the mark for young readers\n3 stars: Decent content that children could understand and somewhat enjoy\n4 stars: Engaging content that would interest most children in this age group\n5 stars: Excellent, highly engaging content that would captivate young readers\n\nConsider factors such as: vocabulary that challenges but doesn't overwhelm, sentence variety that flows well, interesting characters or concepts, descriptive language, relatable situations for upper elementary students, and overall appeal to curious young minds.\n\nProvide your assessment as a JSON object with two keys: 'cefr_level' and 'star_rating'. The 'cefr_level' value should be a string representing the CEFR level (e.g., 'B1' ,'B1+', 'B1-'), and the 'star_rating' value should be an integer from 1 to 5.",
      },
      {
        level: "B2",
        systemPrompt:
          "You are an expert in children's literacy and language assessment for elementary students (grades 3-6). Your task is to evaluate fiction and nonfiction articles for young language learners at the CEFR B2 level. B2 level requires:\n- Wider range of vocabulary, including some interesting expressions that advanced 10-12 year olds would enjoy\n- Varied sentence length and structure (10-12 words on average) with good flow\n- Variety of complex structures and tenses used in ways that challenge but don't confuse advanced young readers\n- Clear, detailed text on interesting topics that intellectually curious upper elementary students would find engaging\n- Content that presents multiple perspectives or ideas while remaining appropriate for children\n\nDetermine if the article matches the CEFR B2 level for children. You may add a '+' or '-' to the level if it's slightly above or below standard (e.g., more than five difficult words or no difficult words for that level).\n\nProvide a star rating based on how engaging the content would be for young readers:\n1 star: Not appealing to children, too difficult, or inappropriate content\n2 stars: Somewhat interesting but misses the mark for young readers\n3 stars: Decent content that children could understand and somewhat enjoy\n4 stars: Engaging content that would interest most children in this age group\n5 stars: Excellent, highly engaging content that would captivate young readers\n\nConsider factors such as: rich vocabulary that expands children's language, well-constructed sentences, interesting characters or concepts, vivid descriptions, content that sparks curiosity, and overall appeal to advanced elementary students.\n\nProvide your assessment as a JSON object with two keys: 'cefr_level' and 'star_rating'. The 'cefr_level' value should be a string representing the CEFR level (e.g., 'B2' ,'B2+', 'B2-'), and the 'star_rating' value should be an integer from 1 to 5.",
      },
    ];

    // read prompts from file

    const levelConfig = rawPromptsPath.find((lvl) => lvl.level === cefrLevel);

    if (!levelConfig) {
      throw new Error(`level config not found for ${cefrLevel}`);
    }

    const userPrompt = `Please evaluate the following story chapter for its CEFR level and provide a star rating based on how engaging the content would be for young readers:
    ### Story Chapter:
    ${chapter.join("\n")}

    ### Instructions:
    - Determine if the article matches the CEFR ${cefrLevel} level for children. You may add a '+' or '-' to the level if it's slightly above or below standard (e.g., more than five difficult words or no difficult words for that level).
    - Provide a star rating based on how engaging the content would be for young readers:
      1 star: Not appealing to children, too difficult, or inappropriate content
      2 stars: Somewhat interesting but misses the mark for young readers
      3 stars: Decent content that children could understand and somewhat enjoy
      4 stars: Engaging content that would interest most children in this age group
      5 stars: Excellent, highly engaging content that would captivate young readers
    - Consider factors such as: vocabulary, sentence structure, interesting characters or facts, descriptions, relatable situations, and overall appeal to young

    Provide your assessment as a JSON object with two keys: 'cefr_level' and 'star_rating'. The 'cefr_level' value should be a string representing the CEFR level (e.g., '${cefrLevel}' ,'${cefrLevel}+', '${cefrLevel}-'), and the 'star_rating' value should be an integer from 1 to 5.`;

    const { output: evaluation } = await generateText({
      model: google(aiModel),
      // model: openai(aiModel),
      output: Output.object({
        schema: z.object({
          rating: z.number().describe("The rating of the story"),
          cefrLevel: z.string().describe("The CEFR level of the story"),
        }),
      }),
      system: levelConfig.systemPrompt,
      prompt: userPrompt,
      // seed: Math.floor(Math.random() * 1000),
      temperature: 0.7,
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

// ★ Helper: Core Logic (ทำงานเงียบๆ ไม่ต้องตะโกน Log)
const processSingleImage = async (
  index: number,
  scene: Record<string, string>,
  charDesc: string,
): Promise<SingleImageResult> => {
  const imageLabel = index === 0 ? "Cover" : `${index}`;
  let attempts = 0;
  let success = false;
  let tempFilePath: string | null = null;

  while (attempts < MAX_RETRIES && !success) {
    try {
      // 1. Generate
      const { images } = await generateImage({
        model: google.image(googleImageModel),
        prompt: constructPrompt(scene.description, charDesc),
        aspectRatio: "4:3",
        n: 1,
      });

      // 2. Save Local
      const file = images[0];
      const base64Image = Buffer.from(file.base64, "base64");
      const localPath = path.join(IMAGES_DIR, `${scene.id}.png`);
      fs.writeFileSync(localPath, base64Image);
      tempFilePath = localPath;

      // 3. Upload
      const cloudPath = `images/story/${scene.id}.png`;
      await uploadToBucket(localPath, cloudPath);

      return { index, url: cloudPath, error: null, tempFile: tempFilePath };
    } catch (error) {
      attempts++;
      // เก็บ Error เงียบๆ ไว้ก่อน รอส่งออกไปทีเดียว
      if (attempts >= MAX_RETRIES) {
        return {
          index,
          url: null,
          error: `Failed image ${index} (${imageLabel}): ${error}`,
          tempFile: tempFilePath,
        };
      }
      // Retry delay logic (silent)
      const delay = Math.pow(2, attempts) * RETRY_DELAY_BASE;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return { index, url: null, error: "Unknown error", tempFile: null };
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

  console.log(
    `🚀 Starting generation for ${imagesDesc.length} images... (Please wait)`,
  );
  const startTime = Date.now();

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

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // ★★★ SUMMARY LOG (โชว์ทีเดียวตอนจบ) ★★★
    console.log("\n===========================================");
    console.log(`📊 GENERATION SUMMARY (${duration}s)`);
    console.log("===========================================");
    console.log(`   ✅ Success : ${successCount}`);
    console.log(`   ❌ Failed  : ${failCount}`);
    console.log("===========================================\n");

    if (failCount > 0) {
      createLogFile(imagesDesc[0].id, errorDetails, "error");
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
      if (fs.existsSync(file))
        try {
          fs.unlinkSync(file);
        } catch (e) {}
    }
  }
};
