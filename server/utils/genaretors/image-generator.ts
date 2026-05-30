import { resolveTaskModel, formatTaskLog } from "@/server/ai/modelResolver";
import { TASK_KEYS } from "@/server/ai/taskKeys";
import { uploadToBucket } from "@/utils/storage";
import { generateText, Output } from "ai";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { AiErrorKind, classifyAiError, withAiRetry } from "./ai-retry";

interface GenerateImageParams {
  imageDesc: string;
  articleId: string;
  passage: string;
}

interface GeneratedImageResult {
  success: boolean;
  imageUrls?: string[];
  error?: string;
  errorKind?: AiErrorKind;
}

// ─── Retry config ─────────────────────────────────────────────────────────────
// The 3 scene images are generated sequentially (for loop, not Promise.all) to
// avoid burst QPM exhaustion. Increase concurrency only after quota is confirmed.

const RETRY_OPTS = {
  maxAttempts: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generatedImage(
  params: GenerateImageParams,
): Promise<GeneratedImageResult> {
  const { imageDesc: _imageDesc, articleId, passage } = params;

  // Ensure the local images directory exists
  const imagesDir = path.join(process.cwd(), "data/images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // ── Step 1: Generate scene descriptions via text model ────────────────────
  let storyParts: { prompt: string[]; mainCharacter: string };
  try {
    const {
      model: sceneModel,
      modelId: sceneModelId,
      providerName: sceneProviderName,
      temperature: sceneTemperature,
    } = await resolveTaskModel(TASK_KEYS.IMAGE_SCENE_PROMPT);
    console.log(
      formatTaskLog({
        taskKey: TASK_KEYS.IMAGE_SCENE_PROMPT,
        modelId: sceneModelId,
        providerName: sceneProviderName,
      }),
    );

    const { output } = await withAiRetry(
      () =>
        generateText({
          model: sceneModel,
          temperature: sceneTemperature,
          output: Output.object({
            schema: z.object({
              prompt: z.array(z.string()).length(3),
              mainCharacter: z
                .string()
                .describe(
                  "Visual description of the character only (e.g. 'A small brown puppy with big ears')",
                ),
            }),
          }),
          system:
            "You are a visual artist. Create 3 separate, highly detailed visual descriptions for an image generator. Focus only on what is seen.",
          prompt: `Create 3 visual descriptions for these story parts: "${passage}".
           Each description must be standalone and visual.
           Character to keep consistent.`,
        }),
      RETRY_OPTS,
      `scene-descriptions:${articleId}`,
    );
    storyParts = output;
  } catch (error) {
    const kind = (error as any).errorKind ?? classifyAiError(error);
    console.error(
      `[image-generator] scene-description generation failed — articleId=${articleId} kind=${kind} error=${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      success: false,
      error: `Scene description generation failed: ${error instanceof Error ? error.message : String(error)}`,
      errorKind: kind,
    };
  }

  // ── Step 2: Generate images sequentially (quota-safe) ────────────────────
  const imageResults: Array<{ base64: string; mediaType: string }> = [];
  const errors: string[] = [];

  for (let i = 0; i < storyParts.prompt.length; i++) {
    const sceneDescription = storyParts.prompt[i];

    try {
      const {
        model: imgModel,
        modelId: imgModelId,
        providerName: imgProviderName,
        temperature: imgTemperature,
      } = await resolveTaskModel(TASK_KEYS.IMAGE_GENERATE);
      console.log(
        formatTaskLog({
          taskKey: TASK_KEYS.IMAGE_GENERATE,
          modelId: imgModelId,
          providerName: imgProviderName,
        }),
      );

      const result = await withAiRetry(
        () =>
          generateText({
            model: imgModel,
            temperature: imgTemperature,
            prompt: `A professional digital illustration for a children's book.
             Character: ${storyParts.mainCharacter}.
             Action: ${sceneDescription}.
             Style: bright colors, 2D flat vector art, cute cartoon, simple background.

             IMPORTANT: No text, no words, no letters, no labels, no signatures, no numbers.
             Clear visual only. High quality.`,
          }),
        RETRY_OPTS,
        `image-gen:${articleId}:scene-${i + 1}`,
      );

      const imageFile = result.files.find((f) =>
        f.mediaType.startsWith("image/"),
      );
      if (!imageFile) {
        const msg = `Scene ${i + 1}: no image file in response`;
        console.warn(`[image-generator] ${msg} articleId=${articleId}`);
        errors.push(msg);
        continue;
      }

      imageResults.push({
        base64: imageFile.base64,
        mediaType: imageFile.mediaType,
      });
      console.info(
        `[image-generator] scene ${i + 1}/3 generated — articleId=${articleId}`,
      );
    } catch (error) {
      const kind = (error as any).errorKind ?? classifyAiError(error);
      const msg = `Scene ${i + 1} image generation failed (kind=${kind}): ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[image-generator] ${msg} articleId=${articleId}`);
      errors.push(msg);
      // Continue to next scene so partial success is possible
    }
  }

  if (imageResults.length === 0) {
    return {
      success: false,
      error: `All 3 image generations failed: ${errors.join("; ")}`,
      errorKind: "QUOTA_EXHAUSTED",
    };
  }

  if (imageResults.length < 3) {
    console.warn(
      `[image-generator] partial image set: ${imageResults.length}/3 generated — articleId=${articleId}`,
    );
  }

  // ── Step 3: Write to disk then upload ────────────────────────────────────
  const generatedUrls: string[] = [];
  const tempFiles: string[] = [];

  for (const [index, image] of imageResults.entries()) {
    const base64Buffer = Buffer.from(image.base64, "base64");
    const localPath = path.join(imagesDir, `${articleId}_${randomUUID()}.png`);
    const cloudPath = `images/${articleId}_${index + 1}.png`;

    fs.writeFileSync(localPath, base64Buffer);
    tempFiles.push(localPath);

    try {
      await uploadToBucket(localPath, cloudPath);
      generatedUrls.push(cloudPath);
      console.info(
        `[image-generator] image ${index + 1} uploaded — articleId=${articleId} path=${cloudPath}`,
      );
    } catch (uploadError) {
      console.error(
        `[image-generator] upload failed — articleId=${articleId} index=${index + 1} error=${uploadError}`,
      );
      errors.push(`Upload failed for image ${index + 1}: ${uploadError}`);
    }
  }

  // ── Step 4: Clean up local temp files ────────────────────────────────────
  for (const tempFile of tempFiles) {
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // Non-fatal — disk will be reclaimed eventually
    }
  }

  if (generatedUrls.length === 0) {
    return {
      success: false,
      error: `Image generation succeeded but all uploads failed: ${errors.join("; ")}`,
    };
  }

  const fullSuccess = generatedUrls.length === 3 && errors.length === 0;
  if (!fullSuccess) {
    console.warn(
      `[image-generator] partial success: ${generatedUrls.length}/3 images uploaded — articleId=${articleId} errors=${errors.join("; ")}`,
    );
  }

  return {
    success: fullSuccess,
    imageUrls: generatedUrls,
    ...(errors.length > 0 && { error: errors.join("; ") }),
  };
}
