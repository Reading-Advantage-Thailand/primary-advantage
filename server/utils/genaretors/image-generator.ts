import { experimental_generateImage as generateImages } from "ai";
import fs from "fs";
import path from "path";
import { openai, openaiImages } from "@/utils/openai";
import { google, googleImages } from "@/utils/google";

interface GenerateImageParams {
  imageDesc: string;
  articleId: string;
}

export async function generateImage(
  params: GenerateImageParams,
  maxRetries = 5
): Promise<void> {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const tempImageName = `temp-${Date.now()}.png`;

      const { image } = await generateImages({
        model: openai.image(openaiImages),
        n: 1,
        prompt: params.imageDesc,
        size: "1024x1024",
      });

      const base64 = image.base64;
      const base64Image: Buffer = Buffer.from(base64, "base64");

      const localPath = path.join(
        process.cwd(),
        "data/images",
        `${params.articleId}.png`
      );
      fs.writeFileSync(localPath, base64Image as Uint8Array);

      //   await uploadToBucket(localPath, `${IMAGE_URL}/${params.articleId}.png`);

      return;
    } catch (error) {
      console.error(
        `Failed to generate image (Attempt ${attempts + 1}):`,
        error
      );
      attempts++;

      if (attempts >= maxRetries) {
        throw new Error(
          `Failed to generate image after ${maxRetries} attempts: ${error}`
        );
      }

      const delay = Math.pow(2, attempts) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
