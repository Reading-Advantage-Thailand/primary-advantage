"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import {
  ShortAnswerQuestion as SAQuestionType,
  ChapterActivityStatus,
} from "@/types/story";
import { useTranslations } from "next-intl";
import QuestionHeader from "./question-header";
import { QuizContextProvider } from "@/contexts/question-context";
import SAQuestionContent from "./sa-question-content";

interface SAQuestionProps {
  questions: SAQuestionType[];
  chapterId: string;
  storyId: string;
  chapterNumber: number;
  activity: ChapterActivityStatus;
}

export default function SAQuestion({
  questions,
  chapterId,
  storyId,
  chapterNumber,
  activity,
}: SAQuestionProps) {
  const t = useTranslations("Question");
  const tc = useTranslations("Components");

  return (
    <Card className="w-full">
      <QuestionHeader
        heading={t("SAQuestion.title")}
        description={t("SAQuestion.description")}
        buttonLabel={tc("startQuiz")}
        disabled={false}
        isCompleted={activity.isShortAnswerCompleted}
      >
        <QuizContextProvider>
          <SAQuestionContent
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
