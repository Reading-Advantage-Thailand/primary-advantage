"use client";

import {
  useAutoSaveFlashcard,
  ArticleActivityStatus,
} from "@/hooks/use-auto-save-flashcard";
import { WordFlashcard, SentenceFlashcard } from "@/types/story";

interface ArticleFlashcardAutoSaveProps {
  articleId: string;
  activityStatus: ArticleActivityStatus;
  words: WordFlashcard[] | null;
  sentences: SentenceFlashcard[] | null;
  wordsAudioUrl?: string;
  sentencesAudioUrl?: string;
}

export default function ArticleFlashcardAutoSave({
  articleId,
  activityStatus,
  words,
  sentences,
  wordsAudioUrl,
  sentencesAudioUrl,
}: ArticleFlashcardAutoSaveProps) {
  useAutoSaveFlashcard({
    articleId,
    activityStatus,
    words,
    sentences,
    wordsAudioUrl,
    sentencesAudioUrl,
    enabled: true,
  });

  return null;
}
