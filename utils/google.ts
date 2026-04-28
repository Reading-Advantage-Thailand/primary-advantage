import { createVertex } from "@ai-sdk/google-vertex";
import "dotenv/config";

const google = createVertex({
  project: process.env.PROJECT_ID,
  location: "global",
  googleAuthOptions: {
    credentials: {
      client_email: process.env.VERTEX_CLIENT_EMAIL,
      private_key: process.env.VERTEX_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
    },
  },
});

const googleModel = "	gemini-3-flash-preview";
const googleModelLite = "gemini-3.1-flash-lite-preview";
const googleModelPro = "gemini-3.1-pro-preview";
const googleImage = "gemini-3.1-flash-image-preview";
const googleImageModel = "gemini-2.5-flash-image";

export {
  google,
  googleModel,
  googleModelLite,
  googleModelPro,
  googleImage,
  googleImageModel,
};
