/**
 * Pure helpers for sentence-coverage and timing-integrity validation.
 *
 * These functions are used by both story-checks.ts and article-checks.ts to
 * detect partial read-along coverage (issue #138 root cause) and
 * timing anomalies in stored SentenceTimepoints.
 *
 * Design constraints:
 * - No DB queries, no LLM calls, no audio-duration dependency
 * - Deterministic and fully unit-testable
 * - Handles both SentenceTimepoint[] (post-alignment) and string[] (legacy)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal shape we need from a stored timepoint */
export interface TimepointLike {
  sentence: string;
  startTime: number;
  endTime: number;
}

// ─── Text normalisation ───────────────────────────────────────────────────────

/**
 * Strip punctuation, lowercase, collapse all whitespace to single spaces, and
 * trim. This mirrors the normalization Lemonfox TTS tokens undergo so that
 * coverage comparison is stable regardless of punctuation differences.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/[^\w\s]/g, " ") // strip punctuation (keep alphanumeric + space)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Coverage helpers ─────────────────────────────────────────────────────────

/**
 * Extract the display text from a stored sentences value.
 *
 * `sentences` from the DB is typed as `unknown` (Prisma Json). It may be:
 *   - SentenceTimepoint[]  (post-alignment, the intended shape)
 *   - string[]             (legacy LLM output before alignment)
 *   - anything else        (treat as empty)
 */
export function extractSentenceText(sentences: unknown): string {
  if (!Array.isArray(sentences) || sentences.length === 0) return "";

  const parts: string[] = [];
  for (const item of sentences) {
    if (typeof item === "string") {
      // Legacy string[]
      parts.push(item);
    } else if (
      item !== null &&
      typeof item === "object" &&
      "sentence" in item &&
      typeof (item as Record<string, unknown>).sentence === "string"
    ) {
      // SentenceTimepoint-like
      parts.push((item as Record<string, unknown>).sentence as string);
    }
  }

  return parts.join(" ");
}

/**
 * Compute the coverage ratio: how much of `passage` is covered by the
 * concatenated sentence text, measured on normalized word tokens.
 *
 * Returns a value in [0, 1].
 *
 * Algorithm: count unique normalized tokens in `passage` that also appear in
 * the normalized sentence text. This tolerates minor word-order differences
 * while still catching large gaps. For a full match the ratio is 1.0.
 */
export function computeCoverageRatio(
  sentences: unknown,
  passage: string,
): number {
  const sentenceText = extractSentenceText(sentences);
  if (!passage || passage.trim().length === 0) return 1; // empty passage → trivially covered

  const passageNorm = normalizeText(passage);
  const sentenceNorm = normalizeText(sentenceText);

  if (passageNorm.length === 0) return 1;
  if (sentenceNorm.length === 0) return 0;

  const passageWords = passageNorm.split(" ").filter(Boolean);
  if (passageWords.length === 0) return 1;

  // Build a multiset of sentence words for fast lookup
  const sentenceWordCounts = new Map<string, number>();
  for (const w of sentenceNorm.split(" ").filter(Boolean)) {
    sentenceWordCounts.set(w, (sentenceWordCounts.get(w) ?? 0) + 1);
  }

  // Count passage words that are matched in the sentence multiset
  const usedCounts = new Map<string, number>();
  let matched = 0;
  for (const w of passageWords) {
    const available =
      (sentenceWordCounts.get(w) ?? 0) - (usedCounts.get(w) ?? 0);
    if (available > 0) {
      usedCounts.set(w, (usedCounts.get(w) ?? 0) + 1);
      matched++;
    }
  }

  return matched / passageWords.length;
}

// ─── Timing helpers ───────────────────────────────────────────────────────────

export interface TimingViolation {
  kind:
    | "non_monotonic"
    | "overlap"
    | "first_start_too_late"
    | "inter_gap_too_large";
  index?: number; // 0-based index of the timepoint (or the second of a pair)
  detail?: string;
}

/**
 * Validate timing integrity of a stored timepoints array.
 *
 * Checks performed:
 *   1. First startTime must be < FIRST_START_MAX_S (default 2 s) — catches
 *      a complete desync where no sentence starts near the audio beginning.
 *   2. Each timepoint: startTime < endTime (non-negative duration).
 *   3. Sequential pairs: endTime[i] ≤ startTime[i+1] (monotonic, non-overlapping).
 *   4. Sequential pairs: inter-timepoint gap (startTime[i+1] − endTime[i]) ≤
 *      INTER_GAP_MAX_S (default 3 s). A larger gap typically signals a missing
 *      sentence that was dropped by the aligner.
 *
 * NOTE: We deliberately omit a tail-vs-audioDuration check because audio
 * duration is not stored in the DB.
 */
export function checkTimingIntegrity(
  sentences: unknown,
  options?: {
    firstStartMaxS?: number;
    interGapMaxS?: number;
  },
): TimingViolation[] {
  const firstStartMaxS = options?.firstStartMaxS ?? 2;
  const interGapMaxS = options?.interGapMaxS ?? 3;

  if (!Array.isArray(sentences) || sentences.length === 0) return [];

  // Extract timepoints — only items with numeric startTime/endTime
  const timepoints: TimepointLike[] = [];
  for (const item of sentences) {
    if (
      item !== null &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).startTime === "number" &&
      typeof (item as Record<string, unknown>).endTime === "number" &&
      typeof (item as Record<string, unknown>).sentence === "string"
    ) {
      timepoints.push(item as TimepointLike);
    }
  }

  if (timepoints.length === 0) return []; // legacy string[] — no timing to check

  const violations: TimingViolation[] = [];

  // 1. First startTime
  if (timepoints[0].startTime > firstStartMaxS) {
    violations.push({
      kind: "first_start_too_late",
      index: 0,
      detail: `startTime=${timepoints[0].startTime.toFixed(2)}s > ${firstStartMaxS}s`,
    });
  }

  for (let i = 0; i < timepoints.length; i++) {
    const tp = timepoints[i];

    // 2. startTime < endTime
    if (tp.startTime >= tp.endTime) {
      violations.push({
        kind: "non_monotonic",
        index: i,
        detail: `startTime=${tp.startTime} >= endTime=${tp.endTime}`,
      });
    }

    if (i > 0) {
      const prev = timepoints[i - 1];

      // 3. Non-overlapping: prev.endTime <= tp.startTime
      if (prev.endTime > tp.startTime) {
        violations.push({
          kind: "overlap",
          index: i,
          detail: `timepoints[${i - 1}].endTime=${prev.endTime} > timepoints[${i}].startTime=${tp.startTime}`,
        });
      }

      // 4. Inter-gap check
      const gap = tp.startTime - prev.endTime;
      if (gap > interGapMaxS) {
        violations.push({
          kind: "inter_gap_too_large",
          index: i,
          detail: `gap=${gap.toFixed(2)}s between timepoints[${i - 1}] and timepoints[${i}]`,
        });
      }
    }
  }

  return violations;
}

// ─── Exported thresholds (so callers can reference without magic numbers) ─────

/** Coverage ratio below which we emit a partial-coverage issue */
export const COVERAGE_THRESHOLD = 0.9;

/** First timepoint startTime must be below this (seconds) */
export const FIRST_START_MAX_S = 2;

/** Inter-timepoint gap above this triggers a missing-sentence warning (seconds) */
export const INTER_GAP_MAX_S = 3;
