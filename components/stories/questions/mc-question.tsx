"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuestionState } from "@/types/enum";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  MultipleChoiceQuestion as MCQuestionType,
  ChapterActivityStatus,
} from "@/types/story";
import { QuizContextProvider } from "@/contexts/question-context";
import QuestionHeader from "./question-header";
import { useTranslations } from "next-intl";
import MCQuestionContent from "./mc-question-content";

interface MCQuestionProps {
  questions: MCQuestionType[];
  chapterId: string;
  storyId: string;
  chapterNumber: number;
  activity: ChapterActivityStatus;
}

export default function MCQuestion({
  questions,
  chapterId,
  storyId,
  chapterNumber,
  activity,
}: MCQuestionProps) {
  const t = useTranslations("Question");
  const tc = useTranslations("Components");
  return (
    <Card className="w-full">
      <QuestionHeader
        heading={t("MCQuestion.title")}
        description={t("MCQuestion.description")}
        buttonLabel={tc("startQuiz")}
        disabled={false}
        isCompleted={activity.isMultipleChoiceCompleted}
      >
        <QuizContextProvider>
          <MCQuestionContent
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
