"use client";

import { useState } from "react";
import { MCQuestion } from "@/types";
import { ActivityType, AnswerStatus, QuestionState } from "@/types/enum";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizContextProvider } from "@/contexts/question-context";
import MCQuestionContent from "./mc-question-content";
import QuestionHeader from "./question-header";
import RetakeButton from "./retake-button";
import { useTranslations } from "next-intl";

export default function MCQuestionCardClient({
  articleId,
  questions,
  initialState,
  initialScore,
}: {
  articleId: string;
  questions: MCQuestion[];
  initialState: QuestionState;
  initialScore: number;
}) {
  const [questionState, setQuestionState] = useState(initialState);
  const [score, setScore] = useState(initialScore);
  const t = useTranslations("Question");
  const tc = useTranslations("Components");

  const handleComplete = (data: { score: number }) => {
    setScore(data.score);
    setQuestionState(QuestionState.COMPLETED);
  };

  const handleRetake = () => {
    setQuestionState(QuestionState.INCOMPLETE);
    setScore(0);
  };

  if (questionState === QuestionState.INCOMPLETE) {
    return (
      <QuestionHeader
        heading={t("MCQuestion.title")}
        description={t("MCQuestion.description")}
        buttonLabel={tc("startQuiz")}
        disabled={false}
        articleId={articleId}
        activityType={ActivityType.MC_QUESTION}
      >
        <QuizContextProvider>
          <MCQuestionContent
            articleId={articleId}
            questions={questions}
            onComplete={handleComplete}
          />
        </QuizContextProvider>
      </QuestionHeader>
    );
  }

  if (questionState === QuestionState.COMPLETED) {
    return (
      <CardHeader>
        <CardTitle className="text-muted-foreground text-3xl font-bold md:text-3xl">
          {t("MCQuestion.title")}
        </CardTitle>
        <CardDescription>
          <p>{t("descriptionSuccess")}</p>
          <p className="inline font-bold text-green-500 dark:text-green-400">
            {t("descriptionSuccess2", {
              score: score,
              total: 5,
            })}
          </p>
        </CardDescription>

        <RetakeButton
          articleId={articleId}
          type={ActivityType.MC_QUESTION}
          onRetake={handleRetake}
        />
      </CardHeader>
    );
  }
}
