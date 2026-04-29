import { google, googleImage, googleModelLite } from "@/utils/google";
import { uploadToBucket } from "@/utils/storage";
import { generateText, Output } from "ai";
import fs from "fs";
import path from "path";
import { z } from "zod";

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

export async function generatedImage(
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
        model: google(googleModelLite),
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
      });

      const imageResults = [];

      for (const sceneDescription of storyParts.prompt) {
        const result = await generateText({
          model: google(googleImage),
          prompt: `A professional digital illustration for a children's book.
             Character: ${storyParts.mainCharacter}.
             Action: ${sceneDescription}.
             Style: bright colors, 2D flat vector art, cute cartoon, simple background.

             IMPORTANT: No text, no words, no letters, no labels, no signatures, no numbers.
             Clear visual only. High quality.`,
        });

        imageResults.push(result);
      }

      // Validate that exactly 3 files were generated
      if (!imageResults || imageResults.length !== 3) {
        const errorMsg = `Expected 3 images, but got ${imageResults?.length || 0} images`;
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

      for (const [index, image] of imageResults.entries()) {
        const base64Image: Buffer = Buffer.from(
          image.files[0].base64,
          "base64",
        );
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

      return {
        success: true,
        imageUrls: generatedImages,
      };
    } catch (error) {
      const errorMsg = `Attempt ${attempts + 1} failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      attempts++;

      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
        // console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} attempts: ${errors.join("; ")}`,
  };
}
