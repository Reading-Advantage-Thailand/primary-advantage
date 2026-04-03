import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getQuestionsByArticleId } from "@/server/models/articleModel";
import { ActivityType, QuestionState } from "@/types/enum";
import { LAQuestion, QuestionResponse } from "@/types";
import { getTranslations } from "next-intl/server";
import LAQuestionCardClient from "./la-question-card-client";

export default async function LAQuestionCard({
  articleId,
}: {
  articleId: string;
}) {
  const questionsData: QuestionResponse = await getQuestionsByArticleId(
    articleId,
    ActivityType.LA_QUESTION,
  );

  const t = await getTranslations("Question");
  const tc = await getTranslations("Components");

  if (questionsData.questionStatus === QuestionState.ERROR) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-3xl font-bold md:text-3xl">
            {t("LAQuestion.title")}
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
            {t("LAQuestion.title")}
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
        <LAQuestionCardClient
          articleId={articleId}
          questions={questionsData.questions as LAQuestion}
          initialState={questionsData.questionStatus}
        />
      </Card>
    );
  }
}
