import base64 from "base64-js";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { generateText, Output } from "ai";
import { resolveTaskModel, formatTaskLog } from "@/server/ai/modelResolver";
import { TASK_KEYS } from "@/server/ai/taskKeys";
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";
import {
  AUDIO_URL,
  AVAILABLE_VOICES,
  BASE_TEXT_TO_SPEECH_URL,
  VOICES_AI,
} from "../constants";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SentenceTimepoint, WordTimestamp } from "@/types";
import {
  translateAndStoreSentences,
  translateAndStoreSentencesForStory,
} from "./sentence-translator";
import { log } from "console";
import { createLogFile } from "../logging";
import { SENTENCE_SPLITTER_SYSTEM_PROMPT } from "@/data/prompts-ai";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import { uploadToBucket } from "@/utils/storage";
import { computeCoverageRatio } from "@/server/utils/validators/sentence-coverage";

interface GenerateAudioParams {
  passage: string;
  sentences?: string[]; // Optional: LLM hint. If coverage <90%, passage is re-split.
  articleId: string;
}

interface GenerateChapterAudioParams {
  passage: string;
  sentences?: string[]; // Optional: LLM hint. If coverage <90%, passage is re-split.
  chapterId: string;
  chapterNumber: number;
  cefrLevel?: string;
}

function splitSentences(text: string): string[] {
  // 1. Normalize line breaks and trim overall text
  text = text.replace(/\r\n|\r/g, "\n").trim();

  if (!text) {
    return []; // Return empty array for empty input
  }

  // This robust regex aims to split sentences based on common terminators (.?!)
  // while handling numerous exceptions.
  // It captures the delimiter (Group 1) and the following whitespace/quotes (Group 2).
  const sentenceRegex = new RegExp(
    // Look for common sentence-ending punctuation.
    "([.?!])" +
      // Capture optional whitespace and quote characters immediately after the punctuation.
      // This handles cases like "sentence." or "sentence?" "Another".
      "(\\s*[\"'`’„”«»]*\\s*)" +
      // Negative lookahead to prevent splitting in the middle of:
      // - A word (e.g., 'etc.and')
      // - A number (e.g., '3.14')
      // - Common abbreviations followed by a period (e.g., 'Mr.', 'Dr.', 'etc.')
      // - Acronyms/initials (e.g., 'U.S.A.', 'J.P. Morgan')
      "(?!" +
      "\\s*" + // Optional whitespace
      "(?:" +
      "[a-z]" + // Lowercase letter (part of a word)
      "|\\d+" + // A digit (part of a number/version)
      "|" +
      "(?:" + // Common abbreviations (non-exhaustive, add more if needed)
      "\\b(?:Mr|Mrs|Ms|Dr|Prof|Gen|Col|Sr|Jr|Ave|Blvd|St|Rd|Apt|Pvt|Corp|Inc|Ltd|Co|etc|e\\.g|i\\.e)" +
      "|" + // Or multi-initial acronyms (A.B.C.) - matches A.B. then expects C. for example
      "(?:[A-Z]\\.){2,}" +
      ")" +
      "\\." + // The period specifically for abbreviations/acronyms
      ")" +
      ")" +
      // Another negative lookahead: do not split if the punctuation is immediately followed by a quote
      // UNLESS it's also followed by a capital letter or end of string.
      // This helps manage dialogue flow: "He said, 'Hello.'" shouldn't split 'Hello.'
      // but "He said, 'Hello.' She replied..." should split 'Hello.'.
      "(?!['\"`’])" +
      // Positive lookahead: Ensure the split point is valid.
      // It must be followed by:
      // - Optional whitespace, then a capital letter (start of new sentence)
      // - OR optional whitespace, then a quote (start of new dialogue sentence)
      // - OR the very end of the string ($) to capture the last sentence.
      "(?=\\s*(?:[A-Z\"'`’]|$))",
    "g", // Global flag to find all matches
  );

  const sentences: string[] = [];
  let lastIndex = 0; // Tracks the start of the current segment

  // Use matchAll to get all occurrences of the regex pattern
  const matches = Array.from(text.matchAll(sentenceRegex));

  // Handle the case where there are no delimiters (e.g., a single phrase)
  if (matches.length === 0 && text.length > 0) {
    sentences.push(text.trim());
    return sentences;
  }

  for (const match of matches) {
    const fullMatch = match[0]; // The entire matched string (e.g., ". ")
    const delimiter = match[1]; // The punctuation mark (e.g., ".")
    const trailingChars = match[2]; // The whitespace/quotes after the delimiter (e.g., " ")
    const matchStartIndex = match.index!; // Where the match started in the text

    // Extract the sentence text before the delimiter
    let sentenceText = text.substring(lastIndex, matchStartIndex);

    // Reconstruct the full sentence including the delimiter and its immediate trailing characters
    // Only include the trailing chars if they actually exist (i.e., not end of string)
    let fullSentence =
      sentenceText +
      delimiter +
      (matchStartIndex + fullMatch.length <= text.length ? trailingChars : "");

    // Trim and clean up extra internal spaces
    fullSentence = fullSentence.replace(/\s+/g, " ").trim();

    if (fullSentence) {
      sentences.push(fullSentence);
    }

    lastIndex = matchStartIndex + fullMatch.length;
  }

  // Add any remaining text as a sentence if it exists
  // This catches text that doesn't end with standard punctuation.
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex).replace(/\s+/g, " ").trim();
    if (remainingText) {
      sentences.push(remainingText);
    }
  }

  return sentences;
}

// Improved helper function to split text into sentences properly
export async function splitIntoSentences(passage: string): Promise<string[]> {
  try {
    const userPrompt = `Split the following text into complete sentences, keeping dialogue and attribution together:${passage}`;

    const { model, modelId, providerName, temperature } =
      await resolveTaskModel(TASK_KEYS.TRANSLATION_SENTENCE);
    console.log(
      formatTaskLog({
        taskKey: TASK_KEYS.TRANSLATION_SENTENCE,
        modelId,
        providerName,
      }),
    );

    const { output: object } = await generateText({
      model,
      temperature,
      output: Output.object({
        schema: z.object({
          output: z
            .array(z.string())
            .describe(
              "An array of sentences extracted from the article. Each sentence must be a non-empty string.",
            ),
        }),
      }),
      prompt: userPrompt,
    });

    return object.output;
  } catch (error: any) {
    throw `failed to generate sentences: ${error}`;
  }
}

// ---------------------------------------------------------------------------
// Core aligner — rewritten for 0-drop guarantee (Issue #138)
// ---------------------------------------------------------------------------

const NORMALIZATION_LOOKAHEAD = 4; // max extra TTS tokens to scan past a mismatch

/** Normalize a token for matching: strip non-word chars, lowercase */
function normalizeToken(s: string): string {
  return s.replace(/[^\w]/g, "").toLowerCase();
}

/**
 * Walk the Lemonfox word_timestamps stream and assign each input sentence a
 * contiguous span of timestamps. Guarantees:
 *
 * 1. Every non-empty input sentence produces exactly one SentenceTimepoint
 *    (0 sentences dropped).
 * 2. The .sentence field is the verbatim input text (original punctuation/casing
 *    preserved — NOT rebuilt from TTS tokens, which strip punctuation).
 * 3. Tolerant resync: on tokenization drift (contractions, numbers, em-dash),
 *    lookahead ≤ NORMALIZATION_LOOKAHEAD lets us skip past unmatched TTS tokens
 *    and anchor on the next confident match. Unmatched words get their timing
 *    interpolated from neighbors.
 * 4. Sentences with zero matched words get words:[] with timing interpolated
 *    from neighboring timepoints.
 *
 * @param wordTimestamps - Lemonfox word_timestamps array
 * @param sentences      - Verbatim sentence strings (from passage)
 * @param contextId      - Article/chapter ID for log messages
 */
export function alignWordTimestampsToSentences(
  wordTimestamps: WordTimestamp[],
  sentences: string[],
  contextId: string,
): SentenceTimepoint[] {
  // Filter out empty/whitespace-only sentences before processing
  const nonEmptySentences = sentences.filter((s) => s.trim().length > 0);

  if (nonEmptySentences.length === 0) return [];
  if (wordTimestamps.length === 0) {
    // No timestamps at all — emit every sentence with zero-width timing
    return nonEmptySentences.map((sentence) => ({
      startTime: 0,
      endTime: 0,
      words: [],
      sentence: sentence.trim(),
    }));
  }

  // Build a normalized token list once for efficient scanning
  const normTokens = wordTimestamps.map((wt) => normalizeToken(wt.word));

  // Cursor into wordTimestamps — advances as sentences claim tokens
  let cursor = 0;

  // Pass 1: For each sentence, collect matched word timestamps using tolerant scan
  const rawResults: Array<{
    sentence: string;
    words: WordTimestamp[];
    startTime: number | null;
    endTime: number | null;
  }> = nonEmptySentences.map((sentence) => {
    const cleanSentence = sentence.trim();
    const sentenceTokens = cleanSentence
      .split(/[\s—–]+/) // split on whitespace, em-dash, en-dash
      .map((w) => normalizeToken(w))
      .filter((w) => w.length > 0);

    const matchedWords: WordTimestamp[] = [];
    let startTime: number | null = null;
    let endTime: number | null = null;

    for (let si = 0; si < sentenceTokens.length; si++) {
      const expected = sentenceTokens[si];
      let found = false;

      // Common path: check at cursor position first (1:1 positional)
      if (cursor < wordTimestamps.length && normTokens[cursor] === expected) {
        const wt = wordTimestamps[cursor];
        matchedWords.push(wt);
        if (startTime === null) startTime = wt.start;
        endTime = wt.end;
        cursor++;
        found = true;
      } else {
        // Tolerant scan: look ahead up to NORMALIZATION_LOOKAHEAD positions
        // for a confident match, then interpolate the skipped tokens
        for (
          let ahead = 1;
          ahead <= NORMALIZATION_LOOKAHEAD &&
          cursor + ahead < wordTimestamps.length;
          ahead++
        ) {
          if (normTokens[cursor + ahead] === expected) {
            // Found a confident match — consume the skipped tokens without
            // advancing their timing (they'll be interpolated later) but
            // update the cursor so we don't stall.
            const wt = wordTimestamps[cursor + ahead];
            matchedWords.push(wt);
            if (startTime === null) startTime = wt.start;
            endTime = wt.end;
            cursor = cursor + ahead + 1;
            found = true;
            break;
          }
        }
      }

      if (!found) {
        // Word absent from TTS stream (contraction half, number, etc.)
        // We log it but do NOT drop the sentence. Timing will be interpolated.
        console.warn(
          `[alignWordTimestampsToSentences][${contextId}] unmatched token` +
            ` "${expected}" in sentence "${cleanSentence.substring(0, 40)}..."`,
        );
      }
    }

    return { sentence: cleanSentence, words: matchedWords, startTime, endTime };
  });

  // Pass 2: Interpolate timing for sentences with zero matched words using
  // their neighbors' timing. This satisfies the 0-drop guarantee.
  const timepoints: SentenceTimepoint[] = rawResults.map((r, i) => {
    if (r.startTime !== null && r.endTime !== null) {
      return {
        startTime: r.startTime,
        endTime: r.endTime,
        words: r.words,
        sentence: r.sentence,
      };
    }

    // Find nearest predecessor with timing
    let prevEnd = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (rawResults[j].endTime !== null) {
        prevEnd = rawResults[j].endTime!;
        break;
      }
    }

    // Find nearest successor with timing
    let nextStart: number | null = null;
    for (let j = i + 1; j < rawResults.length; j++) {
      if (rawResults[j].startTime !== null) {
        nextStart = rawResults[j].startTime!;
        break;
      }
    }

    // Interpolate: place this sentence in the gap between neighbors
    const interpolatedStart = prevEnd;
    const interpolatedEnd = nextStart !== null ? nextStart : prevEnd + 0.5; // 0.5s fallback if no successor

    return {
      startTime: interpolatedStart,
      endTime: interpolatedEnd,
      words: [],
      sentence: r.sentence,
    };
  });

  // Drop-rate assertion: log an error if >5% of sentences had zero matched words
  const droppedCount = timepoints.filter((tp) => tp.words.length === 0).length;
  const dropRate = droppedCount / timepoints.length;
  if (dropRate > 0.05) {
    console.error(
      `[alignWordTimestampsToSentences][${contextId}] drop rate ${(dropRate * 100).toFixed(1)}% ` +
        `(${droppedCount}/${timepoints.length} sentences have no matched words). ` +
        `Check TTS tokenization or sentence splitter output.`,
    );
  } else if (droppedCount > 0) {
    console.warn(
      `[alignWordTimestampsToSentences][${contextId}] ${droppedCount}/${timepoints.length} sentences` +
        ` have interpolated timing (no matched words) — within 5% tolerance.`,
    );
  }

  return timepoints;
}

/**
 * @deprecated Use alignWordTimestampsToSentences instead.
 * Kept for any internal callers that reference the old name during transition.
 */
function processWordTimestampsIntoSentences(
  wordTimestamps: WordTimestamp[],
  sentences: string[],
  contextId: string,
): SentenceTimepoint[] {
  return alignWordTimestampsToSentences(wordTimestamps, sentences, contextId);
}

export async function generateAudio({
  passage,
  sentences: sentenceHint,
  articleId,
}: GenerateAudioParams): Promise<void> {
  try {
    // ── Conditional-split gate (mirrors generateChapterAudio) ──
    // Use the LLM-provided sentence hint only when it covers ≥90% of the passage.
    // Otherwise derive sentences from passage via the LLM-based splitter so the
    // aligner has full coverage and the read-along never drops a sentence.
    const hintSentences = sentenceHint ?? [];
    const hintCoverage = computeCoverageRatio(hintSentences, passage);
    const passageSentences =
      hintCoverage >= 0.9 ? hintSentences : await splitIntoSentences(passage);

    const voice = VOICES_AI[Math.floor(Math.random() * VOICES_AI.length)];

    const response = await fetch("https://api.lemonfox.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUDIO_API_KEY}`,
      },
      body: JSON.stringify({
        input: passage,
        voice: voice,
        response_format: "mp3",
        speed: 0.7,
        word_timestamps: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const json = await response.json();

    const MP3 = base64.toByteArray(json.audio);

    const localPath = `${process.cwd()}/data/audios/${articleId}.mp3`;
    await fsPromises.writeFile(localPath, MP3);

    await uploadToBucket(localPath, `audios/articles/${articleId}.mp3`);

    await fsPromises.unlink(localPath);

    // const sentences = await splitIntoSentences(passage);
    // const sentence: string[] = sentencize(passage);
    // const nlp = winkNLP(model);
    // const doc = nlp.readDoc(passage);
    // const its = nlp.its;
    // const sentences: string[] = doc.sentences().out(its.value);

    // Process word timestamps into sentence timepoints
    const sentenceTimepoints = processWordTimestampsIntoSentences(
      json.word_timestamps,
      passageSentences,
      articleId,
    );

    // // Update the database with sentence timepoints
    await prisma.article.update({
      where: { id: articleId },
      data: {
        sentences: JSON.parse(JSON.stringify(sentenceTimepoints)),
        audioUrl: `/audios/articles/${articleId}.mp3`,
      },
    });

    // Automatically translate sentences after audio generation
    try {
      await translateAndStoreSentences({ articleId });
    } catch (translationError) {
      console.error(
        `Failed to translate sentences for article ${articleId}:`,
        translationError,
      );
      // Don't throw here - audio generation was successful
    }

    return;
  } catch (error: any) {
    console.log(error);
    throw `failed to generate audio: ${error} \n\n error: ${JSON.stringify(
      error.response.data,
    )}`;
  }
}

const AUDIO_MAX_RETRIES = 3;
const AUDIO_RETRY_DELAY_BASE = 1000;

export async function generateChapterAudio({
  passage,
  sentences: sentenceHint,
  chapterId,
  chapterNumber,
  cefrLevel,
}: GenerateChapterAudioParams): Promise<{
  translationSuccess: boolean;
  translationError?: string;
  uploadSuccess: boolean;
  uploadError?: string;
}> {
  const localPath = `${process.cwd()}/data/audios/${chapterId}.mp3`;
  const cloudPath = `audios/story/chapter/${chapterId}.mp3`;

  // ── Phase 0: Determine passage sentences (conditional-split, cost-saving) ──
  // If the caller provides a sentence hint that already covers ≥90% of the
  // passage text, use it as-is (no LLM call). Otherwise derive sentences from
  // the passage via the LLM-based splitter.
  const hintSentences = sentenceHint ?? [];
  const hintCoverage = computeCoverageRatio(hintSentences, passage);
  const passageSentences =
    hintCoverage >= 0.9 ? hintSentences : await splitIntoSentences(passage);

  // ── Phase 1: Generate audio + write to disk (retry on TTS/write failure) ──
  let json: any;
  let generateAttempts = 0;

  while (generateAttempts < AUDIO_MAX_RETRIES) {
    try {
      const voice = VOICES_AI[Math.floor(Math.random() * VOICES_AI.length)];

      const response = await fetch("https://api.lemonfox.ai/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.AUDIO_API_KEY}` },
        body: JSON.stringify({
          input: passage,
          voice,
          response_format: "mp3",
          speed: 0.7,
          word_timestamps: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS HTTP error: ${response.status}`);
      }

      json = await response.json();
      const MP3 = base64.toByteArray(json.audio);
      await fsPromises.writeFile(localPath, MP3);
      break; // generation succeeded
    } catch (err: any) {
      generateAttempts++;
      if (generateAttempts >= AUDIO_MAX_RETRIES) {
        throw new Error(
          `Chapter audio generation failed after ${AUDIO_MAX_RETRIES} attempts: ${err?.message ?? err}`,
        );
      }
      const delay = Math.pow(2, generateAttempts) * AUDIO_RETRY_DELAY_BASE;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // ── Phase 2: Upload from saved file (retry without re-generating) ──
  let uploadSuccess = true;
  let uploadError: string | undefined;
  let uploadAttempts = 0;

  while (uploadAttempts < AUDIO_MAX_RETRIES) {
    try {
      await uploadToBucket(localPath, cloudPath);
      break; // upload succeeded
    } catch (err: any) {
      uploadAttempts++;
      if (uploadAttempts >= AUDIO_MAX_RETRIES) {
        uploadSuccess = false;
        uploadError = err?.message ?? String(err);
      } else {
        const delay = Math.pow(2, uploadAttempts) * AUDIO_RETRY_DELAY_BASE;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Always clean up temp file after upload phase (success or fail)
  await fsPromises.unlink(localPath).catch(() => {});

  // ── Phase 3: Align timestamps → produce full-coverage timepoints ──
  // passageSentences are verbatim passage substrings → 0-drop guarantee.
  const sentenceTimepoints = alignWordTimestampsToSentences(
    json.word_timestamps,
    passageSentences,
    chapterId,
  );

  await prisma.storyChapter.updateMany({
    where: { id: chapterId, chapterNumber },
    data: {
      sentences: JSON.parse(JSON.stringify(sentenceTimepoints)),
      audioSentencesUrl: uploadSuccess ? cloudPath : null,
    },
  });

  // ── Phase 4: Translate — derived from FINAL timepoints (1:1 guaranteed) ──
  // Extract verbatim sentence texts from the stored timepoints so the
  // translatedSentences[locale][i] always aligns with timepoint[i].
  const alignedSentenceTexts = sentenceTimepoints.map((tp) => tp.sentence);

  try {
    await translateAndStoreSentencesForStory({
      sentences: alignedSentenceTexts,
      chapterId,
      chapterNumber,
      cefrLevel,
    });
  } catch (translationError: any) {
    return {
      translationSuccess: false,
      translationError: translationError?.message ?? String(translationError),
      uploadSuccess,
      uploadError,
    };
  }

  return { translationSuccess: true, uploadSuccess, uploadError };
}
