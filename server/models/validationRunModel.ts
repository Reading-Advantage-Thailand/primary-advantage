import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { STALE_RUN_THRESHOLD_MS } from "@/server/utils/validators/types";

export type ContentType = "article" | "story";
export type TriggeredBy = "cron" | "manual" | "backfill";

export async function createValidationRun(
  contentType: ContentType,
  triggeredBy: TriggeredBy,
) {
  return prisma.validationRun.create({
    data: { contentType, triggeredBy },
  });
}

export async function finishValidationRun(
  id: string,
  totals: {
    itemsChecked: number;
    itemsOk: number;
    itemsRepaired: number;
    itemsBroken: number;
    itemsPermanentlyBroken: number;
    durationMs: number;
    errors?: unknown[];
  },
) {
  return prisma.validationRun.update({
    where: { id },
    data: {
      finishedAt: new Date(),
      itemsChecked: totals.itemsChecked,
      itemsOk: totals.itemsOk,
      itemsRepaired: totals.itemsRepaired,
      itemsBroken: totals.itemsBroken,
      itemsPermanentlyBroken: totals.itemsPermanentlyBroken,
      durationMs: totals.durationMs,
      errors:
        totals.errors && totals.errors.length > 0
          ? (totals.errors as unknown as Prisma.InputJsonValue)
          : undefined,
    },
  });
}

/**
 * Returns the most recent in-flight run for the given contentType,
 * or null if no run is currently active. Used as a soft lock — combined
 * with the 30-min stale window, a crashed run auto-clears.
 */
export async function findActiveRun(contentType: ContentType) {
  return prisma.validationRun.findFirst({
    where: {
      contentType,
      finishedAt: null,
      startedAt: { gt: new Date(Date.now() - STALE_RUN_THRESHOLD_MS) },
    },
    orderBy: { startedAt: "desc" },
  });
}
