import { prisma } from "@/lib/prisma";
import { Prisma, ValidationStatus } from "@prisma/client";
import {
  ValidationOutcome,
  ValidationSummary,
  MAX_REPAIR_ATTEMPTS,
  MAX_BATCH_LIMIT,
} from "@/server/utils/validators/types";
import {
  checkStory,
  StoryForCheck,
  StoryChapterForCheck,
} from "@/server/utils/validators/checks/story-checks";
import { planStoryRepair } from "@/server/utils/validators/repairs/story-repairs";
import {
  createValidationRun,
  finishValidationRun,
  findActiveRun,
} from "@/server/models/validationRunModel";
import { ValidationLogger, ValidationStep } from "@/lib/logger";

export type ValidationMode =
  | "pending_and_broken"
  | "all_published"
  | "specific_ids";

export interface RunStoryValidationParams {
  mode: ValidationMode;
  ids?: string[];
  limit: number;
  dryRun: boolean;
  triggeredBy: "cron" | "manual" | "backfill";
  // When true: include PERMANENTLY_BROKEN rows in the candidate set and
  // treat each row's repairAttempts baseline as 0 for this run. Used to
  // recover legacy permanents after a repair-logic fix.
  force?: boolean;
}

const STORY_INCLUDE = {
  storyChapters: {
    select: {
      id: true,
      chapterNumber: true,
      passage: true,
      summary: true,
      imageDescription: true,
      audioSentencesUrl: true,
      sentences: true,
      translatedSentences: true,
      translatedSummary: true,
    },
    orderBy: { chapterNumber: "asc" as const },
  },
} satisfies Prisma.StoryInclude;

/**
 * Strip the "[chapterId]" suffix from a repair action name so it matches
 * a ValidationStep literal for logging. e.g.
 *   "repair_chapter_image[ck123]" → "repair_chapter_image"
 */
function normalizeStep(actionName: string): ValidationStep {
  return actionName.replace(/\[.+\]$/, "") as ValidationStep;
}

export async function runStoryValidation(
  params: RunStoryValidationParams,
): Promise<{ summary: ValidationSummary; conflict?: { runId: string } }> {
  const active = await findActiveRun("story");
  if (active) {
    return {
      summary: emptySummary(active.id),
      conflict: { runId: active.id },
    };
  }

  const run = await createValidationRun("story", params.triggeredBy);
  const startedAt = Date.now();

  const totals = {
    itemsChecked: 0,
    itemsOk: 0,
    itemsRepaired: 0,
    itemsBroken: 0,
    itemsPermanentlyBroken: 0,
  };
  const failures: ValidationOutcome[] = [];
  const runErrors: string[] = [];

  try {
    const stories = await fetchCandidates(params);

    for (const story of stories) {
      totals.itemsChecked++;
      try {
        const outcome = await processStory(
          story,
          params.dryRun,
          run.id,
          params.force ?? false,
        );
        if (outcome.status === "OK") totals.itemsOk++;
        else if (outcome.status === "BROKEN") {
          totals.itemsBroken++;
          failures.push(outcome);
        } else if (outcome.status === "PERMANENTLY_BROKEN") {
          totals.itemsPermanentlyBroken++;
          failures.push(outcome);
        }
        if (
          outcome.status === "OK" &&
          outcome.repairsRun.length > 0 &&
          outcome.repairsRun.some((r) => r.success)
        ) {
          totals.itemsRepaired++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        runErrors.push(`story ${story.id}: ${msg}`);
        totals.itemsBroken++;
        failures.push({
          id: story.id,
          status: "BROKEN",
          attempts: story.repairAttempts,
          issues: [],
          repairsRun: [],
        });
      }
    }
  } finally {
    await finishValidationRun(run.id, {
      ...totals,
      durationMs: Date.now() - startedAt,
      errors: runErrors.length > 0 ? runErrors : undefined,
    });
  }

  console.log(
    `[validation] stories run done — checked: ${totals.itemsChecked}, ok: ${totals.itemsOk}, repaired: ${totals.itemsRepaired}, broken: ${totals.itemsBroken}, permanent: ${totals.itemsPermanentlyBroken}, duration: ${Math.round((Date.now() - startedAt) / 1000)}s`,
  );

  return {
    summary: {
      validationRunId: run.id,
      itemsChecked: totals.itemsChecked,
      itemsOk: totals.itemsOk,
      itemsRepaired: totals.itemsRepaired,
      itemsBroken: totals.itemsBroken,
      itemsPermanentlyBroken: totals.itemsPermanentlyBroken,
      durationMs: Date.now() - startedAt,
      failures,
    },
  };
}

type StoryWithChapters = Prisma.StoryGetPayload<{
  include: typeof STORY_INCLUDE;
}>;

async function fetchCandidates(
  params: RunStoryValidationParams,
): Promise<StoryWithChapters[]> {
  const limit = Math.min(Math.max(params.limit, 1), MAX_BATCH_LIMIT);

  let where: Prisma.StoryWhereInput;
  switch (params.mode) {
    case "specific_ids":
      if (!params.ids || params.ids.length === 0) return [];
      where = { id: { in: params.ids } };
      break;
    case "all_published":
      where = { isPublished: true };
      break;
    case "pending_and_broken":
    default: {
      const statuses: ValidationStatus[] = [
        ValidationStatus.PENDING,
        ValidationStatus.BROKEN,
      ];
      if (params.force) statuses.push(ValidationStatus.PERMANENTLY_BROKEN);
      where = { validationStatus: { in: statuses } };
      break;
    }
  }

  return prisma.story.findMany({
    where,
    include: STORY_INCLUDE,
    take: limit,
    orderBy: [
      { validatedAt: { sort: "asc", nulls: "first" } },
      { createdAt: "asc" },
    ],
  });
}

async function processStory(
  story: StoryWithChapters,
  dryRun: boolean,
  validationRunId: string,
  force: boolean,
): Promise<ValidationOutcome> {
  // When force=true, ignore the stored repairAttempts so the row is eligible
  // for repair again — recovers rows incorrectly stuck at PERMANENTLY_BROKEN.
  const baseAttempts = force ? 0 : story.repairAttempts;
  const logger = new ValidationLogger();

  const storyForCheck: StoryForCheck = {
    id: story.id,
    summary: story.summary,
    translatedSummary: story.translatedSummary,
  };
  const chaptersForCheck: StoryChapterForCheck[] = story.storyChapters.map(
    (ch) => ({
      id: ch.id,
      chapterNumber: ch.chapterNumber,
      audioSentencesUrl: ch.audioSentencesUrl,
      sentences: ch.sentences,
      translatedSentences: ch.translatedSentences,
      translatedSummary: ch.translatedSummary,
      passage: ch.passage,
    }),
  );

  const initialIssues = await checkStory(storyForCheck, chaptersForCheck);

  if (initialIssues.length === 0) {
    if (!dryRun) {
      await prisma.story.update({
        where: { id: story.id },
        data: {
          validationStatus: ValidationStatus.OK,
          validatedAt: new Date(),
          repairAttempts: 0,
          lastValidationIssues: Prisma.DbNull,
          isPublished: true,
        },
      });
    }
    return {
      id: story.id,
      status: ValidationStatus.OK,
      attempts: story.repairAttempts,
      issues: [],
      repairsRun: [],
    };
  }

  if (baseAttempts >= MAX_REPAIR_ATTEMPTS) {
    if (!dryRun) {
      await prisma.story.update({
        where: { id: story.id },
        data: {
          validationStatus: ValidationStatus.PERMANENTLY_BROKEN,
          validatedAt: new Date(),
          isPublished: false,
          lastValidationIssues:
            initialIssues as unknown as Prisma.InputJsonValue,
        },
      });
    }
    await logger.flush({
      contentType: "story",
      contentId: story.id,
      validationRunId,
      finalStatus: "PERMANENTLY_BROKEN",
      attempts: story.repairAttempts,
    });
    return {
      id: story.id,
      status: ValidationStatus.PERMANENTLY_BROKEN,
      attempts: story.repairAttempts,
      issues: initialIssues,
      repairsRun: [],
    };
  }

  if (dryRun) {
    return {
      id: story.id,
      status: ValidationStatus.BROKEN,
      attempts: baseAttempts,
      issues: initialIssues,
      repairsRun: [],
    };
  }

  const chaptersById = new Map(
    story.storyChapters.map((ch) => [
      ch.id,
      {
        id: ch.id,
        chapterNumber: ch.chapterNumber,
        passage: ch.passage,
        summary: ch.summary,
        imageDescription: ch.imageDescription,
        sentences: ch.sentences,
      },
    ]),
  );

  const actions = planStoryRepair(initialIssues, {
    story: {
      id: story.id,
      summary: story.summary,
      imageDescription: story.imageDescription,
      characters: story.characters,
      cefrLevel: story.cefrLevel,
    },
    chaptersById,
  });

  const repairsRun = [];
  for (const action of actions) {
    const result = await action.run();
    repairsRun.push(result);
    if (!result.success) {
      logger.addIssue({
        step: normalizeStep(action.name),
        severity: "WARN",
        message: `${action.name}: ${result.error ?? "unknown"}`,
      });
    }
  }

  // ── Re-check after repair ──
  const refreshed = await prisma.story.findUnique({
    where: { id: story.id },
    include: STORY_INCLUDE,
  });
  const remainingIssues = refreshed
    ? await checkStory(
        {
          id: refreshed.id,
          summary: refreshed.summary,
          translatedSummary: refreshed.translatedSummary,
        },
        refreshed.storyChapters.map((ch) => ({
          id: ch.id,
          chapterNumber: ch.chapterNumber,
          audioSentencesUrl: ch.audioSentencesUrl,
          sentences: ch.sentences,
          translatedSentences: ch.translatedSentences,
          translatedSummary: ch.translatedSummary,
          passage: ch.passage,
        })),
      )
    : initialIssues;

  let finalStatus: ValidationStatus;
  let nextAttempts = baseAttempts;
  if (remainingIssues.length === 0) {
    finalStatus = ValidationStatus.OK;
    nextAttempts = 0;
  } else {
    nextAttempts = baseAttempts + 1;
    finalStatus =
      nextAttempts >= MAX_REPAIR_ATTEMPTS
        ? ValidationStatus.PERMANENTLY_BROKEN
        : ValidationStatus.BROKEN;
  }

  await prisma.story.update({
    where: { id: story.id },
    data: {
      validationStatus: finalStatus,
      validatedAt: new Date(),
      repairAttempts: nextAttempts,
      lastValidationIssues:
        remainingIssues.length > 0
          ? (remainingIssues as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      ...(finalStatus === ValidationStatus.OK
        ? { isPublished: true }
        : finalStatus === ValidationStatus.PERMANENTLY_BROKEN
          ? { isPublished: false }
          : {}),
    },
  });

  await logger.flush({
    contentType: "story",
    contentId: story.id,
    validationRunId,
    finalStatus: finalStatus as "OK" | "BROKEN" | "PERMANENTLY_BROKEN",
    attempts: nextAttempts,
  });

  return {
    id: story.id,
    status: finalStatus,
    attempts: nextAttempts,
    issues: remainingIssues,
    repairsRun,
  };
}

function emptySummary(runId: string): ValidationSummary {
  return {
    validationRunId: runId,
    itemsChecked: 0,
    itemsOk: 0,
    itemsRepaired: 0,
    itemsBroken: 0,
    itemsPermanentlyBroken: 0,
    durationMs: 0,
    failures: [],
  };
}
