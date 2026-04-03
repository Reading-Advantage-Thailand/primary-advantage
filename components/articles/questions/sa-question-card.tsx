import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getQuestionsByArticleId } from "@/server/models/articleModel";
import { ActivityType, QuestionState } from "@/types/enum";
import { QuestionResponse, SAQuestion } from "@/types";
import { getTranslations } from "next-intl/server";
import SAQuestionCardClient from "./sa-question-card-client";

export default async function SAQuestionCard({
  articleId,
}: {
  articleId: string;
}) {
  const questionsData: QuestionResponse = await getQuestionsByArticleId(
    articleId,
    ActivityType.SA_QUESTION,
  );

  const t = await getTranslations("Question");
  const tc = await getTranslations("Components");

  if (questionsData.questionStatus === QuestionState.ERROR) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-3xl font-bold md:text-3xl">
            {t("SAQuestion.title")}
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
            {t("SAQuestion.title")}
          </CardTitle>
          <CardDescription>{t("descriptionLoading")}</CardDescription>
          <Skeleton className="mt-2 h-8 w-full" />
        </CardHeader>
      </Card>
    );
  }

  if (questionsData.questionStatus === QuestionState.INCOMPLETE ||
      questionsData.questionStatus === QuestionState.COMPLETED) {
    const initialResult = questionsData.questionStatus === QuestionState.COMPLETED
      ? {
          question: questionsData.result?.details.question ?? "",
          suggestedAnswer: questionsData.result?.details.suggestedAnswer ?? "",
          feedback: questionsData.result?.details.feedback ?? "",
          yourAnswer: questionsData.result?.details.yourAnswer ?? "",
        }
      : null;

    return (
      <Card className="w-full">
        <SAQuestionCardClient
          articleId={articleId}
          questions={questionsData.questions as SAQuestion}
          initialState={questionsData.questionStatus}
          initialResult={initialResult}
        />
      </Card>
    );
  }
}
