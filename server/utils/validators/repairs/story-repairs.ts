import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateStoryImage } from "@/server/utils/genaretors/story-generator";
import { generateChapterAudio } from "@/server/utils/genaretors/audio-generator";
import { generateAudioForFlashcard } from "@/server/utils/genaretors/audio-flashcard-generator";
import { regenerateFlashcardContent } from "@/server/utils/genaretors/flashcard-content-generator";
import { translateSummary } from "@/server/utils/genaretors/summary-translator";
import {
  Issue,
  RepairAction,
  RepairResult,
} from "@/server/utils/validators/types";

interface StoryForRepair {
  id: string;
  summary: string;
  imageDescription: string;
  characters: unknown;
  cefrLevel: string | null;
}

interface ChapterForRepair {
  id: string;
  chapterNumber: number;
  passage: string;
  summary: string;
  imageDescription: string;
  sentences: unknown;
}

// ─── Atomic repair functions ─────────────────────────────────────────────────

async function repairStoryCover(story: StoryForRepair): Promise<void> {
  const characters = (story.characters ?? []) as Record<string, string>[];
  const result = await generateStoryImage(characters, [
    { id: story.id, description: story.imageDescription },
  ]);
  if (!result.success) {
    throw new Error(result.error ?? "Story cover regeneration failed");
  }
}

async function repairChapterImage(
  story: StoryForRepair,
  chapter: ChapterForRepair,
): Promise<void> {
  const characters = (story.characters ?? []) as Record<string, string>[];
  const result = await generateStoryImage(characters, [
    { id: chapter.id, description: chapter.imageDescription },
  ]);
  if (!result.success) {
    throw new Error(result.error ?? "Chapter image regeneration failed");
  }
}

async function repairChapterAudio(
  story: StoryForRepair,
  chapter: ChapterForRepair,
): Promise<void> {
  // generateChapterAudio now handles sentence derivation internally:
  // - If the stored sentences cover ≥90% of the passage, they are reused as-is.
  // - Otherwise it calls splitIntoSentences(passage) to get full-coverage sentences.
  // Passing the existing sentences as an optional hint avoids an unnecessary LLM
  // call when the chapter was only partially broken (e.g. audio missing but
  // sentences are still good).
  const hintSentences = Array.isArray(chapter.sentences)
    ? (chapter.sentences as Array<{ sentence?: string } | string>)
        .map((s) => (typeof s === "string" ? s : (s?.sentence ?? "")))
        .filter((s) => s.length > 0)
    : [];

  await generateChapterAudio({
    passage: chapter.passage,
    sentences: hintSentences,
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    cefrLevel: story.cefrLevel ?? undefined,
  });
}

async function repairChapterTranslatedSummary(
  story: StoryForRepair,
  chapter: ChapterForRepair,
): Promise<void> {
  const translated = await translateSummary(
    chapter.summary,
    story.cefrLevel ?? undefined,
  );
  await prisma.storyChapter.update({
    where: { id: chapter.id },
    data: { translatedSummary: translated as unknown as Prisma.InputJsonValue },
  });
}

async function repairStoryTranslatedSummary(
  story: StoryForRepair,
): Promise<void> {
  const translated = await translateSummary(
    story.summary,
    story.cefrLevel ?? undefined,
  );
  await prisma.story.update({
    where: { id: story.id },
    data: { translatedSummary: translated as unknown as Prisma.InputJsonValue },
  });
}

async function repairChapterFlashcardAudio(
  story: StoryForRepair,
  chapter: ChapterForRepair,
): Promise<void> {
  const row = await prisma.sentencsAndWordsForFlashcard.findFirst({
    where: { storyChapterId: chapter.id },
  });
  if (!row) {
    throw new Error(
      "Cannot repair chapter flashcard audio — flashcard row missing",
    );
  }

  // Flashcards are an AI-curated subset, not the full passage. If either
  // column is null/empty, re-pick the missing side(s) via AI.
  let sentenceData: unknown = row.sentence;
  let wordsData: unknown = row.words;
  const sentenceMissing =
    !Array.isArray(row.sentence) || row.sentence.length === 0;
  const wordsMissing = !Array.isArray(row.words) || row.words.length === 0;

  if (sentenceMissing || wordsMissing) {
    const regenerated = await regenerateFlashcardContent(
      chapter.passage,
      story.cefrLevel,
    );
    const updateData: Prisma.SentencsAndWordsForFlashcardUpdateInput = {};
    if (sentenceMissing) {
      sentenceData = regenerated.flashcard;
      updateData.sentence =
        regenerated.flashcard as unknown as Prisma.InputJsonValue;
    }
    if (wordsMissing) {
      wordsData = regenerated.wordlist;
      updateData.words =
        regenerated.wordlist as unknown as Prisma.InputJsonValue;
    }
    await prisma.sentencsAndWordsForFlashcard.update({
      where: { id: row.id },
      data: updateData,
    });
  }

  await generateAudioForFlashcard({
    sentences: (sentenceData ?? []) as never,
    words: (wordsData ?? []) as never,
    contentId: chapter.id,
    job: "story",
  });
}

async function repairChapterFlashcardRow(
  story: StoryForRepair,
  chapter: ChapterForRepair,
): Promise<void> {
  // Re-pick flashcard sentences + vocabulary via AI, matching the original
  // generator's pedagogical curation.
  const regenerated = await regenerateFlashcardContent(
    chapter.passage,
    story.cefrLevel,
  );
  await prisma.sentencsAndWordsForFlashcard.create({
    data: {
      storyChapterId: chapter.id,
      sentence: regenerated.flashcard as unknown as Prisma.InputJsonValue,
      words: regenerated.wordlist as unknown as Prisma.InputJsonValue,
    },
  });
  await repairChapterFlashcardAudio(story, chapter);
}

// ─── planStoryRepair: dispatch ───────────────────────────────────────────────

interface StoryRepairContext {
  story: StoryForRepair;
  chaptersById: Map<string, ChapterForRepair>;
}

export function planStoryRepair(
  issues: Issue[],
  ctx: StoryRepairContext,
): RepairAction[] {
  const need = {
    storyTranslatedSummary: false,
    storyCover: false,
  };
  const chapterNeeds = new Map<
    string,
    {
      image: boolean;
      audio: boolean;
      translatedSummary: boolean;
      flashcardAudio: boolean;
      flashcardRow: boolean;
    }
  >();

  function getChapterNeed(chapterId: string) {
    if (!chapterNeeds.has(chapterId)) {
      chapterNeeds.set(chapterId, {
        image: false,
        audio: false,
        translatedSummary: false,
        flashcardAudio: false,
        flashcardRow: false,
      });
    }
    return chapterNeeds.get(chapterId)!;
  }

  for (const issue of issues) {
    switch (issue.type) {
      case "story_translated_summary_missing":
        need.storyTranslatedSummary = true;
        break;
      case "story_cover_image_missing":
        need.storyCover = true;
        break;
      case "chapter_image_missing":
        getChapterNeed(issue.chapterId).image = true;
        break;
      case "chapter_audio_missing":
      case "chapter_sentences_empty":
      case "chapter_sentences_partial":
      case "chapter_sentences_timing_integrity":
        getChapterNeed(issue.chapterId).audio = true;
        break;
      case "chapter_translation_missing":
        if (issue.field === "summary")
          getChapterNeed(issue.chapterId).translatedSummary = true;
        else if (issue.field === "sentences")
          // Translations come for free with audio repair (generateChapterAudio
          // calls translateAndStoreSentencesForStory internally).
          getChapterNeed(issue.chapterId).audio = true;
        break;
      case "chapter_translation_count_mismatch":
        getChapterNeed(issue.chapterId).audio = true;
        break;
      case "chapter_flashcard_row_missing":
        getChapterNeed(issue.chapterId).flashcardRow = true;
        break;
      case "chapter_flashcard_sentence_audio_missing":
      case "chapter_flashcard_word_audio_missing":
        getChapterNeed(issue.chapterId).flashcardAudio = true;
        break;
    }
  }

  const actions: RepairAction[] = [];

  if (need.storyCover)
    actions.push(wrap("repair_story_cover", () => repairStoryCover(ctx.story)));

  for (const [chapterId, n] of chapterNeeds) {
    const chapter = ctx.chaptersById.get(chapterId);
    if (!chapter) continue;

    if (n.image)
      actions.push(
        wrap(`repair_chapter_image[${chapterId}]`, () =>
          repairChapterImage(ctx.story, chapter),
        ),
      );
    if (n.audio)
      actions.push(
        wrap(`repair_chapter_audio[${chapterId}]`, () =>
          repairChapterAudio(ctx.story, chapter),
        ),
      );
    if (n.translatedSummary)
      actions.push(
        wrap(`repair_chapter_translated_summary[${chapterId}]`, () =>
          repairChapterTranslatedSummary(ctx.story, chapter),
        ),
      );
    if (n.flashcardRow)
      actions.push(
        wrap(`repair_chapter_flashcard_row[${chapterId}]`, () =>
          repairChapterFlashcardRow(ctx.story, chapter),
        ),
      );
    else if (n.flashcardAudio)
      actions.push(
        wrap(`repair_chapter_flashcard_audio[${chapterId}]`, () =>
          repairChapterFlashcardAudio(ctx.story, chapter),
        ),
      );
  }

  if (need.storyTranslatedSummary)
    actions.push(
      wrap("repair_story_translated_summary", () =>
        repairStoryTranslatedSummary(ctx.story),
      ),
    );

  return actions;
}

function wrap(name: string, fn: () => Promise<void>): RepairAction {
  return {
    name,
    run: async (): Promise<RepairResult> => {
      try {
        await fn();
        return { name, success: true };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { name, success: false, error };
      }
    },
  };
}
