import { NoImageGeneratedError, APICallError, generateText, Output } from "ai";
import { vertex } from "@ai-sdk/google-vertex";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { openai, openaiImages } from "@/utils/openai";
import { google, googleImage, googleModelLite } from "@/utils/google";
import { uploadToBucket } from "@/utils/storage";
import { z } from "zod";
import { Uploadable } from "openai/uploads";
import { createLogFile } from "../logging";

interface GenerateImageParams {
  imageDesc: string;
  articleId: string;
  passage: string;
}

interface GeneratedImageResult {
  success: boolean;
  imageUrls?: string[];
  error?: string;
}

export async function generateImage(
  params: GenerateImageParams,
  maxRetries = 5,
): Promise<GeneratedImageResult> {
  const { imageDesc, articleId, passage } = params;
  const errors: string[] = [];

  // Ensure the local images directory exists
  const imagesDir = path.join(process.cwd(), "data/images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const outDir = path.join(process.cwd(), "public/story");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Retry logic to ensure exactly 3 images are generated
  let attempts = 0;
  let generatedImages: string[] = [];

  while (attempts < maxRetries) {
    try {
      console.log(
        `Attempt ${attempts + 1}/${maxRetries} to generate 3 images for article ${articleId}`,
      );

      const { output: storyParts } = await generateText({
        model: openai("gpt-4o-mini"),
        output: Output.object({
          schema: z.object({
            prompt: z.array(z.string()),
            mainCharacter: z
              .string()
              .describe(
                "create a character description for a story, make it detailed and consistent",
              ),
          }),
        }),
        system:
          "You're a visual storyteller. Break a visual story into 3 image prompts.",
        prompt: `Create 3 consecutive image generation prompts based on this story: "${imageDesc}". Each should describe a moment continuing from the last. return only the prompts, is array of prompts.`,
      });

      const result = await generateText({
        model: google(googleImage),
        prompt: `Create a high-quality, stylistically consistent digital illustration that visually represents:
        Main character: ${storyParts.mainCharacter}

        following are the image descriptions:
        image 1: ${storyParts.prompt[0]}
        image 2: ${storyParts.prompt[1]}
        image 3: ${storyParts.prompt[2]}

        
        Style: brightly colored cartoon illustration, storybook style. Generate exactly 3 separate images, 1 image per file.`,
      });

      // Validate that exactly 3 files were generated
      if (!result.files || result.files.length !== 3) {
        const errorMsg = `Expected 3 images, but got ${result.files?.length || 0} images`;
        console.warn(errorMsg);
        errors.push(errorMsg);
        attempts++;

        // Add delay before retry
        if (attempts < maxRetries) {
          const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        continue;
      }

      // Process and save the 3 images
      generatedImages = [];
      const tempFiles: string[] = [];

      for (const [index, file] of result.files.entries()) {
        const base64Image: Buffer = Buffer.from(file.base64, "base64");
        const localPath = path.join(imagesDir, `${articleId}_${index + 1}.png`);
        fs.writeFileSync(localPath, base64Image as Uint8Array);
        tempFiles.push(localPath);

        await uploadToBucket(localPath, `images/${articleId}_${index + 1}.png`);
        generatedImages.push(`images/${articleId}_${index + 1}.png`);
      }

      // Clean up temporary local files after successful upload
      for (const tempFile of tempFiles) {
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          console.warn(
            `Failed to clean up local file ${tempFile}:`,
            cleanupError,
          );
        }
      }

      console.log(
        `Successfully generated and saved 3 images for article ${articleId}`,
      );
      break; // Success - exit retry loop
    } catch (error) {
      const errorMsg = `Attempt ${attempts + 1} failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      attempts++;

      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Check final result
  if (generatedImages.length !== 3) {
    createLogFile(articleId, errors, "error");
    return {
      success: false,
      error: `Failed to generate exactly 3 images after ${maxRetries} attempts. Generated ${generatedImages.length} images. Errors: ${errors.join(", ")}`,
    };
  }

  return {
    success: true,
    imageUrls: generatedImages,
  };
}
