import { ValidationStatus } from "@prisma/client";

// ─── Issue discriminated union ───────────────────────────────────────────────

export type Issue =
  // Article-scoped
  | { type: "image_missing"; index: number } // 1..3
  | { type: "audio_missing" }
  | { type: "sentences_empty" }
  | { type: "sentences_count_mismatch"; expected: number; actual: number }
  | { type: "translation_locale_missing"; field: "passage" | "summary"; locale: string }
  | { type: "translation_count_mismatch"; field: "passage"; locale: string; expected: number; actual: number }
  | { type: "flashcard_sentence_audio_missing" }
  | { type: "flashcard_word_audio_missing" }
  | { type: "flashcard_row_missing" }
  // Story parent
  | { type: "story_translated_summary_missing"; locale: string }
  | { type: "story_cover_image_missing" }
  // Story chapter
  | { type: "chapter_image_missing"; chapterId: string; chapterNumber: number }
  | { type: "chapter_audio_missing"; chapterId: string; chapterNumber: number }
  | { type: "chapter_sentences_empty"; chapterId: string; chapterNumber: number }
  | { type: "chapter_translation_missing"; chapterId: string; chapterNumber: number; field: "summary" | "sentences"; locale: string }
  | { type: "chapter_translation_count_mismatch"; chapterId: string; chapterNumber: number; locale: string; expected: number; actual: number }
  | { type: "chapter_flashcard_sentence_audio_missing"; chapterId: string; chapterNumber: number }
  | { type: "chapter_flashcard_word_audio_missing"; chapterId: string; chapterNumber: number }
  | { type: "chapter_flashcard_row_missing"; chapterId: string; chapterNumber: number };

// ─── Repair plan + result ────────────────────────────────────────────────────

export interface RepairAction {
  name: string;
  run: () => Promise<RepairResult>;
}

export interface RepairResult {
  name: string;
  success: boolean;
  error?: string;
}

// ─── Per-row outcome ─────────────────────────────────────────────────────────

export interface ValidationOutcome {
  id: string;
  status: ValidationStatus;
  attempts: number;
  issues: Issue[];      // post-repair remaining issues; empty if OK
  repairsRun: RepairResult[];
}

// ─── Run-level summary returned by controllers ───────────────────────────────

export interface ValidationSummary {
  validationRunId: string;
  itemsChecked: number;
  itemsOk: number;
  itemsRepaired: number;
  itemsBroken: number;
  itemsPermanentlyBroken: number;
  durationMs: number;
  failures: ValidationOutcome[]; // only BROKEN + PERMANENTLY_BROKEN
}

// ─── Run constants ───────────────────────────────────────────────────────────

export const MAX_REPAIR_ATTEMPTS = 3;
export const REQUIRED_LOCALES = ["th", "vi", "cn", "tw"] as const;
export const EXPECTED_IMAGES_PER_ARTICLE = 3;
export const DEFAULT_BATCH_LIMIT = 100;
export const MAX_BATCH_LIMIT = 500;
export const STALE_RUN_THRESHOLD_MS = 30 * 60 * 1000; // 30 min

export type RequiredLocale = (typeof REQUIRED_LOCALES)[number];
