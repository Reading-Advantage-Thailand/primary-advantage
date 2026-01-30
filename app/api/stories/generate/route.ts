import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/utils/middleware";
import { generateStoryContentController } from "@/server/controllers/storieController";
import { z } from "zod";

// Schema for validating request body
const generateStorySchema = z.object({
  amountPerGen: z.number().int().min(1).max(10).default(1),
});

/**
 * Validates request for Cloud Scheduler via API key
 */
function validateSchedulerRequest(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  const schedulerApiKey = process.env.ACCESS_KEY;

  // Debug logging
  console.log("[Story Generate] Checking scheduler auth:", {
    hasApiKey: !!apiKey,
    hasSchedulerApiKey: !!schedulerApiKey,
    contentType: req.headers.get("content-type"),
    userAgent: req.headers.get("user-agent"),
  });

  if (!apiKey || !schedulerApiKey) {
    return false;
  }

  return apiKey === schedulerApiKey;
}

/**
 * POST /api/stories/generate
 *
 * Generate new stories. Supports both:
 * - Manual triggers (authenticated via session with withAuth)
 * - Scheduled triggers (authenticated via API key from Cloud Scheduler)
 *
 * Request body:
 * - amountPerGen: number (1-10, default: 1)
 *
 * Returns 202 Accepted immediately, generation runs in background.
 */
export async function POST(req: NextRequest) {
  // Check for Cloud Scheduler API key first
  const isSchedulerRequest = validateSchedulerRequest(req);

  if (isSchedulerRequest) {
    // Handle scheduler request
    return handleGeneration(req, "scheduler");
  }

  // For non-scheduler requests, use withAuth
  return withAuth(
    async (authReq, context, user) => {
      console.log(
        `[Story Generate] Manual request from user ${user.id} (${user.email})`,
      );
      return handleGeneration(authReq, "session");
    },
    ["ADMIN_ACCESS", "SYSTEM_ACCESS"],
    false, // requireAllPermissions = false (any permission is enough)
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

      const parsed = generateStorySchema.parse(body);
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
      console.warn("[Story Generate] Body parse failed, using default:", error);
      amountPerGen = 1;
    }

    // Log the generation request
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    console.log(`[Story Generate] Request ${requestId} started`, {
      source,
      amountPerGen,
      timestamp,
    });

    // Start generation in background (fire and forget)
    setImmediate(async () => {
      try {
        console.log(
          `[Story Generate] Request ${requestId} - Generation starting...`,
        );

        await generateStoryContentController(amountPerGen);

        console.log(
          `[Story Generate] Request ${requestId} - Generation completed successfully`,
        );
      } catch (error) {
        console.error(
          `[Story Generate] Request ${requestId} - Generation failed:`,
          error,
        );
      }
    });

    // Return 202 Accepted immediately
    return NextResponse.json(
      {
        message: "Story generation started",
        requestId,
        amountPerGen,
        source,
        timestamp,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("[Story Generate] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/stories/generate
 *
 * Health check endpoint for Cloud Scheduler verification
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      endpoint: "/api/stories/generate",
      methods: ["POST"],
      description:
        "Story generation endpoint for manual and scheduled triggers",
    },
    { status: 200 },
  );
}
