import React from "react";
import { MCQuestion, QuestionResponse } from "@/types";
import { QuestionState } from "@/types/enum";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getQuestionsByArticleId } from "@/server/models/articleModel";
import { ActivityType } from "@/types/enum";
import { getTranslations } from "next-intl/server";
import MCQuestionCardClient from "./mc-question-card-client";

export default async function MCQuestionCard({
  articleId,
}: {
  articleId: string;
}) {
  const questionsData: QuestionResponse = await getQuestionsByArticleId(
    articleId,
    ActivityType.MC_QUESTION,
  );

  let correct;

  if (questionsData.result) {
    correct = questionsData.result?.details?.score ?? 0;
  }

  const t = await getTranslations("Question");
  const tc = await getTranslations("Components");

  if (questionsData.questionStatus === QuestionState.ERROR) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-3xl font-bold md:text-3xl">
            {t("MCQuestion.title")}
          </CardTitle>
          <CardDescription className="text-red-500 dark:text-red-400">
            {t("descriptionError")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (questionsData.questionStatus === QuestionState.LOADING) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-3xl font-bold md:text-3xl">
            {t("MCQuestion.title")}
          </CardTitle>
          <CardDescription>{t("descriptionLoading")}</CardDescription>
          <Skeleton className="mt-2 h-8 w-full" />
        </CardHeader>
      </Card>
    );
  }

  if (questionsData.questionStatus === QuestionState.INCOMPLETE ||
      questionsData.questionStatus === QuestionState.COMPLETED) {
    return (
      <Card className="w-full">
        <MCQuestionCardClient
          articleId={articleId}
          questions={questionsData.questions as MCQuestion[]}
          initialState={questionsData.questionStatus}
          initialScore={correct ?? 0}
        />
      </Card>
    );
  }
}
