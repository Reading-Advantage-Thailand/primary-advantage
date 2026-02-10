import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface StoryIssue {
  step:
    | "topic_generation"
    | "content_generation"
    | "evaluation"
    | "rating_check"
    | "save_to_db"
    | "image_generation"
    | "image_upload"
    | "chapter_audio"
    | "chapter_audio_upload"
    | "sentence_translation"
    | "flashcard_audio"
    | "flashcard_audio_upload";
  severity: "WARN" | "ERROR";
  message: string;
  attempt?: number;
  chapterId?: string;
}

interface StoryLogContext {
  storyId?: string;
  cefrLevel: string;
  genre: string;
  topic: string;
  totalAttempts: number;
  finalStatus: "succeeded" | "failed";
}

// ─── StoryGenerationLogger ───────────────────────────────────────────────────

export class StoryGenerationLogger {
  private issues: StoryIssue[] = [];

  addIssue(issue: StoryIssue): void {
    this.issues.push(issue);
  }

  hasIssues(): boolean {
    return this.issues.length > 0;
  }

  /**
   * Flush collected issues to the Prisma `Logs` table.
   * Writes ONE consolidated record per story — only if there are issues.
   */
  async flush(context: StoryLogContext): Promise<void> {
    if (!this.hasIssues()) return;

    const errorCount = this.issues.filter((i) => i.severity === "ERROR").length;
    const warnCount = this.issues.filter((i) => i.severity === "WARN").length;
    const highestLevel: LogLevel = errorCount > 0 ? "ERROR" : "WARN";

    const storyLabel = context.storyId ?? "unknown";
    const parts: string[] = [];
    if (warnCount > 0) parts.push(`${warnCount} warning(s)`);
    if (errorCount > 0) parts.push(`${errorCount} error(s)`);

    const message = `Story generation [${storyLabel}]: ${parts.join(", ")} — ${context.finalStatus}`;

    // Extract the first error stack trace (if any)
    const firstError = this.issues.find((i) => i.severity === "ERROR");
    const stackTrace = firstError?.message ?? null;

    try {
      await prisma.logs.create({
        data: {
          serviceName: "story-generation",
          traceId: storyLabel,
          level: highestLevel,
          message,
          stackTrace,
          meta: {
            storyId: context.storyId ?? null,
            cefrLevel: context.cefrLevel,
            genre: context.genre,
            topic: context.topic,
            totalAttempts: context.totalAttempts,
            finalStatus: context.finalStatus,
            issues: this.issues as unknown as Prisma.InputJsonValue,
          },
        },
      });
    } catch (err) {
      // Fallback to console if DB write fails — never let logging crash the app
      console.error("[StoryGenerationLogger] Failed to flush log to DB:", err);
      console.error(
        "[StoryGenerationLogger] Issues:",
        JSON.stringify(this.issues, null, 2),
      );
    }
  }

  /** Reset issues for reuse (optional — usually create a new instance) */
  reset(): void {
    this.issues = [];
  }
}
