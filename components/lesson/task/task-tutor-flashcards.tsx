"use client";

import type { Article } from "@/types";
import TutorFlashcardTeachingGame from "../games/tutor-flashcard-teaching-game";

export default function TaskTutorFlashcards({
  article,
}: {
  article: Article;
}) {
  return <TutorFlashcardTeachingGame article={article} />;
}
