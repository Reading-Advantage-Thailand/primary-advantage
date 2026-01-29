"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import {
  LongAnswerQuestion as LAQuestionType,
  ChapterActivityStatus,
} from "@/types/story";
import QuestionHeader from "./question-header";
import { QuizContextProvider } from "@/contexts/question-context";
import { useTranslations } from "next-intl";
import LAQuestionContent from "./la-question-content";

interface LAQuestionProps {
  questions: LAQuestionType[];
  chapterId: string;
  storyId: string;
  chapterNumber: number;
  activity: ChapterActivityStatus;
}

export default function LAQuestion({
  questions,
  chapterId,
  storyId,
  chapterNumber,
  activity,
}: LAQuestionProps) {
  const t = useTranslations("Question");
  const tc = useTranslations("Components");

  return (
    <Card className="w-full">
      <QuestionHeader
        heading={t("LAQuestion.title")}
        description={t("LAQuestion.description")}
        buttonLabel={tc("startQuiz")}
        disabled={activity.isLongAnswerCompleted}
        isCompleted={activity.isLongAnswerCompleted}
      >
        <QuizContextProvider>
          <LAQuestionContent
            questions={questions}
            chapterId={chapterId}
            storyId={storyId}
            chapterNumber={chapterNumber}
            activity={activity}
          />
        </QuizContextProvider>
      </QuestionHeader>
    </Card>
  );
}
