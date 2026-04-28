import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/utils/middleware";
import { generateArticleContentController } from "@/server/controllers/articleGenerationController";
import { z } from "zod";

// Schema for validating request body
const generateArticleSchema = z.object({
  amountPerGen: z.number().int().min(1).max(10).default(1),
});

/**
 * Validates request for Cloud Scheduler via API key
 */
function validateSchedulerRequest(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  const schedulerApiKey = process.env.ACCESS_KEY;

  if (!apiKey || !schedulerApiKey) {
    return false;
  }

  return apiKey === schedulerApiKey;
}

/**
 * POST /api/articles/generate
 *
 * Generate new articles. Supports both:
 * - Manual triggers (authenticated via session with withAuth)
 * - Scheduled triggers (authenticated via API key from Cloud Scheduler)
 *
 * Request body:
 * - amountPerGen: number (1-10, default: 1) — generates 10 articles per unit
 *   (5 CEFR levels × FICTION + NONFICTION)
 *
 * Returns 200 OK once generation completes.
 */
export async function POST(req: NextRequest) {
  const isSchedulerRequest = validateSchedulerRequest(req);

  if (isSchedulerRequest) {
    return handleGeneration(req, "scheduler");
  }

  return withAuth(
    async (authReq, context, user) => {
      console.log(
        `[Article Generate] Manual request from user ${user.id} (${user.email})`,
      );
      return handleGeneration(authReq, "session");
    },
    ["ADMIN_ACCESS", "SYSTEM_ACCESS"],
    false,
  )(req, { params: Promise.resolve({}) });
}

/**
 * Handle the actual generation logic
 */
async function handleGeneration(
  req: NextRequest,
  source: "session" | "scheduler",
) {
  try {
    // Parse and validate request body
    // Handle both application/json and application/octet-stream (Cloud Scheduler default)
    let amountPerGen = 1;
    try {
      const contentType = req.headers.get("content-type") || "";
      let body: Record<string, unknown> = {};

      if (contentType.includes("application/json")) {
        body = await req.json();
      } else {
        // Handle octet-stream or other content types (Cloud Scheduler sends octet-stream)
        const text = await req.text();
        if (text) {
          body = JSON.parse(text);
        }
      }

      const parsed = generateArticleSchema.parse(body);
      amountPerGen = parsed.amountPerGen;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Invalid request body",
            details: error.issues,
          },
          { status: 400 },
        );
      }
      // Default to 1 if no body provided or parse failed
      console.warn(
        "[Article Generate] Body parse failed, using default:",
        error,
      );
      amountPerGen = 1;
    }

    const timestamp = new Date().toISOString();
    console.log(
      `[Article Generate] Starting generation — amountPerGen: ${amountPerGen}, source: ${source}`,
    );

    const summary = await generateArticleContentController(amountPerGen);

    return NextResponse.json(
      {
        message: "Article generation completed successfully",
        amountPerGen,
        source,
        timestamp,
        summary,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[Article Generate] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
