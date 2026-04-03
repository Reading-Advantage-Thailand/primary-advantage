"use client";

import { useState } from "react";
import { SAQuestion } from "@/types";
import { ActivityType, QuestionState } from "@/types/enum";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizContextProvider } from "@/contexts/question-context";
import SAQuestionContent from "./sa-question-content";
import QuestionHeader from "./question-header";
import { useTranslations } from "next-intl";

interface SACompletedResult {
  question: string;
  suggestedAnswer: string;
  feedback: string;
  yourAnswer: string;
}

export default function SAQuestionCardClient({
  articleId,
  questions,
  initialState,
  initialResult,
}: {
  articleId: string;
  questions: SAQuestion;
  initialState: QuestionState;
  initialResult: SACompletedResult | null;
}) {
  const [questionState, setQuestionState] = useState(initialState);
  const [result, setResult] = useState<SACompletedResult | null>(initialResult);
  const t = useTranslations("Question");
  const tc = useTranslations("Components");

  const handleComplete = (data: SACompletedResult) => {
    setResult(data);
    setQuestionState(QuestionState.COMPLETED);
  };

  if (questionState === QuestionState.INCOMPLETE) {
    return (
      <QuestionHeader
        heading={t("SAQuestion.title")}
        description={t("SAQuestion.description")}
        buttonLabel={tc("startQuiz")}
        disabled={false}
        articleId={articleId}
        activityType={ActivityType.SA_QUESTION}
      >
        <QuizContextProvider>
          <SAQuestionContent
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
          {t("SAQuestion.title")}
        </CardTitle>
        <CardDescription>
          <p className="mt-4 text-lg font-bold">{t("SAQuestion.question")}</p>
          <p>{result?.question}</p>
          <p className="mt-4 text-lg font-bold">
            {t("SAQuestion.suggestedAnswer")}
          </p>
          <p>{result?.suggestedAnswer}</p>
          <p className="mt-4 text-lg font-bold">{t("SAQuestion.feedback")}</p>
          <p>{result?.feedback}</p>
          <p className="mt-4 text-lg font-bold">
            {t("SAQuestion.yourAnswer")}
          </p>
          <p className="mt-2 inline font-bold text-green-500 dark:text-green-400">
            {result?.yourAnswer}
          </p>
        </CardDescription>
      </CardHeader>
    );
  }
}
