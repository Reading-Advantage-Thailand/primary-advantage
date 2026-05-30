import { prisma } from "@/lib/prisma";
import { Prisma, ValidationStatus } from "@prisma/client";
import {
  ValidationOutcome,
  ValidationSummary,
  MAX_REPAIR_ATTEMPTS,
  MAX_BATCH_LIMIT,
} from "@/server/utils/validators/types";
import {
  checkArticle,
  ArticleForCheck,
} from "@/server/utils/validators/checks/article-checks";
import { planArticleRepair } from "@/server/utils/validators/repairs/article-repairs";
import {
  createValidationRun,
  finishValidationRun,
  findActiveRun,
} from "@/server/models/validationRunModel";
import { ValidationLogger } from "@/lib/logger";

export type ValidationMode =
  | "pending_and_broken"
  | "all_published"
  | "specific_ids";

export interface RunArticleValidationParams {
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

const ARTICLE_SELECT = {
  id: true,
  passage: true,
  summary: true,
  imageDescription: true,
  cefrLevel: true,
  audioUrl: true,
  sentences: true,
  words: true,
  translatedPassage: true,
  translatedSummary: true,
  validationStatus: true,
  repairAttempts: true,
} as const;

export async function runArticleValidation(
  params: RunArticleValidationParams,
): Promise<{ summary: ValidationSummary; conflict?: { runId: string } }> {
  // ── Soft lock check ──
  const active = await findActiveRun("article");
  if (active) {
    return {
      summary: emptySummary(active.id),
      conflict: { runId: active.id },
    };
  }

  // ── Open the run row ──
  const run = await createValidationRun("article", params.triggeredBy);
  const startedAt = Date.now();

  let articles: Array<
    Prisma.ArticleGetPayload<{ select: typeof ARTICLE_SELECT }>
  > = [];
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
    articles = await fetchCandidates(params);

    for (const article of articles) {
      totals.itemsChecked++;
      try {
        const outcome = await processArticle(
          article,
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
        // Per-row crash — log and continue. Don't poison the whole run.
        const msg = err instanceof Error ? err.message : String(err);
        runErrors.push(`article ${article.id}: ${msg}`);
        totals.itemsBroken++;
        failures.push({
          id: article.id,
          status: "BROKEN",
          attempts: article.repairAttempts,
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
    `[validation] articles run done — checked: ${totals.itemsChecked}, ok: ${totals.itemsOk}, repaired: ${totals.itemsRepaired}, broken: ${totals.itemsBroken}, permanent: ${totals.itemsPermanentlyBroken}, duration: ${Math.round((Date.now() - startedAt) / 1000)}s`,
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

async function fetchCandidates(
  params: RunArticleValidationParams,
): Promise<Array<Prisma.ArticleGetPayload<{ select: typeof ARTICLE_SELECT }>>> {
  const limit = Math.min(Math.max(params.limit, 1), MAX_BATCH_LIMIT);

  let where: Prisma.ArticleWhereInput;
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

  return prisma.article.findMany({
    where,
    select: ARTICLE_SELECT,
    take: limit,
    orderBy: [
      { validatedAt: { sort: "asc", nulls: "first" } },
      { createdAt: "asc" },
    ],
  });
}

async function processArticle(
  article: Prisma.ArticleGetPayload<{ select: typeof ARTICLE_SELECT }>,
  dryRun: boolean,
  validationRunId: string,
  force: boolean,
): Promise<ValidationOutcome> {
  // When force=true, ignore the stored repairAttempts so the row is eligible
  // for repair again — recovers rows incorrectly stuck at PERMANENTLY_BROKEN.
  const baseAttempts = force ? 0 : article.repairAttempts;
  const logger = new ValidationLogger();
  const articleForCheck: ArticleForCheck = {
    id: article.id,
    passage: article.passage,
    summary: article.summary,
    audioUrl: article.audioUrl,
    sentences: article.sentences,
    translatedPassage: article.translatedPassage,
    translatedSummary: article.translatedSummary,
  };

  const initialIssues = await checkArticle(articleForCheck);

  // ── No issues → mark OK ──
  if (initialIssues.length === 0) {
    if (!dryRun) {
      await prisma.article.update({
        where: { id: article.id },
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
      id: article.id,
      status: ValidationStatus.OK,
      attempts: article.repairAttempts,
      issues: [],
      repairsRun: [],
    };
  }

  // ── Permanently broken? ──
  if (baseAttempts >= MAX_REPAIR_ATTEMPTS) {
    if (!dryRun) {
      await prisma.article.update({
        where: { id: article.id },
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
      contentType: "article",
      contentId: article.id,
      validationRunId,
      finalStatus: "PERMANENTLY_BROKEN",
      attempts: article.repairAttempts,
    });
    return {
      id: article.id,
      status: ValidationStatus.PERMANENTLY_BROKEN,
      attempts: article.repairAttempts,
      issues: initialIssues,
      repairsRun: [],
    };
  }

  // ── Dry-run stops here ──
  if (dryRun) {
    return {
      id: article.id,
      status: ValidationStatus.BROKEN,
      attempts: baseAttempts,
      issues: initialIssues,
      repairsRun: [],
    };
  }

  // ── Plan + run repairs ──
  const actions = planArticleRepair(initialIssues, {
    id: article.id,
    passage: article.passage,
    summary: article.summary,
    imageDescription: article.imageDescription,
    cefrLevel: article.cefrLevel,
    sentences: article.sentences,
    words: article.words,
    translatedSummary: article.translatedSummary,
  });

  const repairsRun = [];
  for (const action of actions) {
    const result = await action.run();
    repairsRun.push(result);
    if (!result.success) {
      logger.addIssue({
        step: action.name as never,
        severity: "WARN",
        message: result.error ?? "unknown",
      });
    }
  }

  // ── Re-check after repair ──
  const refreshed = await prisma.article.findUnique({
    where: { id: article.id },
    select: ARTICLE_SELECT,
  });
  const remainingIssues = refreshed
    ? await checkArticle({
        id: refreshed.id,
        passage: refreshed.passage,
        summary: refreshed.summary,
        audioUrl: refreshed.audioUrl,
        sentences: refreshed.sentences,
        translatedPassage: refreshed.translatedPassage,
        translatedSummary: refreshed.translatedSummary,
      })
    : initialIssues;

  // ── Persist final state ──
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

  await prisma.article.update({
    where: { id: article.id },
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
    contentType: "article",
    contentId: article.id,
    validationRunId,
    finalStatus: finalStatus as "OK" | "BROKEN" | "PERMANENTLY_BROKEN",
    attempts: nextAttempts,
  });

  return {
    id: article.id,
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
