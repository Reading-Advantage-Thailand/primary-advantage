import { createVertex } from "@ai-sdk/google-vertex";

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

const googleModel = "gemini-2.5-flash";
const googleModelLite = "gemini-2.5-flash-lite";
const googleImage = "gemini-3-pro-image-preview";
const googleNewModel = "gemini-3-pro-preview";
const googleImageModel = "imagen-4.0-generate-001";

export {
  google,
  googleModel,
  googleModelLite,
  googleImage,
  googleNewModel,
  googleImageModel,
};
