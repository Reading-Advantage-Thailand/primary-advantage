import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/server/utils/middleware";
import { runStoryValidation } from "@/server/controllers/storyValidationController";
import { DEFAULT_BATCH_LIMIT, MAX_BATCH_LIMIT } from "@/server/utils/validators/types";

const validateRequestSchema = z.object({
  mode: z
    .enum(["pending_and_broken", "all_published", "specific_ids"])
    .default("pending_and_broken"),
  ids: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(MAX_BATCH_LIMIT).default(DEFAULT_BATCH_LIMIT),
  dryRun: z.boolean().default(false),
  force: z.boolean().default(false),
});

function validateSchedulerRequest(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  const expected = process.env.ACCESS_KEY;
  return Boolean(apiKey && expected && apiKey === expected);
}

export async function POST(req: NextRequest) {
  if (process.env.VALIDATION_DISABLED === "true") {
    return NextResponse.json({ message: "validation disabled" }, { status: 200 });
  }

  const isScheduler = validateSchedulerRequest(req);
  if (isScheduler) {
    return handle(req, "scheduler", "cron");
  }

  return withAuth(
    async (authReq, _ctx, user) => {
      console.log(`[Story Validate] Manual trigger by system user ${user.id}`);
      return handle(authReq, "session", "manual");
    },
    ["SYSTEM_ACCESS"],
    false,
  )(req, { params: Promise.resolve({}) });
}

async function handle(
  req: NextRequest,
  source: "scheduler" | "session",
  triggeredBy: "cron" | "manual" | "backfill",
) {
  let parsed: z.infer<typeof validateRequestSchema>;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let body: Record<string, unknown> = {};
    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    }
    parsed = validateRequestSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 },
      );
    }
    parsed = validateRequestSchema.parse({});
  }

  const effectiveTriggeredBy =
    parsed.mode === "specific_ids" ? "backfill" : triggeredBy;

  try {
    const { summary, conflict } = await runStoryValidation({
      mode: parsed.mode,
      ids: parsed.ids,
      limit: parsed.limit,
      dryRun: parsed.dryRun,
      triggeredBy: effectiveTriggeredBy,
      force: parsed.force,
    });

    if (conflict) {
      return NextResponse.json(
        {
          message: "Validation already in progress",
          validationRunId: conflict.runId,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: "Story validation completed",
        source,
        timestamp: new Date().toISOString(),
        validationRunId: summary.validationRunId,
        summary: {
          itemsChecked: summary.itemsChecked,
          itemsOk: summary.itemsOk,
          itemsRepaired: summary.itemsRepaired,
          itemsBroken: summary.itemsBroken,
          itemsPermanentlyBroken: summary.itemsPermanentlyBroken,
          durationMs: summary.durationMs,
        },
        failures: summary.failures,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[Story Validate] Unexpected error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
