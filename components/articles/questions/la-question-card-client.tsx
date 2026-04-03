"use client";

import { useState } from "react";
import { LAQuestion } from "@/types";
import { ActivityType, QuestionState } from "@/types/enum";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizContextProvider } from "@/contexts/question-context";
import LAQuestionContent from "./la-question-content";
import QuestionHeader from "./question-header";
import { useTranslations } from "next-intl";

export default function LAQuestionCardClient({
  articleId,
  questions,
  initialState,
}: {
  articleId: string;
  questions: LAQuestion;
  initialState: QuestionState;
}) {
  const [questionState, setQuestionState] = useState(initialState);
  const t = useTranslations("Question");
  const tc = useTranslations("Components");

  const handleComplete = () => {
    setQuestionState(QuestionState.COMPLETED);
  };

  if (questionState === QuestionState.INCOMPLETE) {
    return (
      <QuestionHeader
        heading={t("LAQuestion.title")}
        description={t("LAQuestion.description")}
        buttonLabel={tc("startQuiz")}
        disabled={false}
        articleId={articleId}
        activityType={ActivityType.LA_QUESTION}
      >
        <QuizContextProvider>
          <LAQuestionContent
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
          {t("LAQuestion.title")}
        </CardTitle>
        <CardDescription>{t("descriptionSuccess")}</CardDescription>
      </CardHeader>
    );
  }
}
