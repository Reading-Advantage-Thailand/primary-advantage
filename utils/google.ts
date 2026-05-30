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

export { google };
