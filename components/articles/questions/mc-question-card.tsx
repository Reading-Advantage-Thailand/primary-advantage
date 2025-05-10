import React from "react";
import { MCQuestion } from "@/types";
import { QuestionState, AnswerStatus } from "@/types/enum";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuizContextProvider } from "@/contexts/question-context";
import { Skeleton } from "@/components/ui/skeleton";
import { getQuestionsWithArticleId } from "@/server/models/articles";
import { ActivityType } from "@/types/enum";
import MCQuestionContent from "./mc-question-content";
import QuestionHeader from "./question-header";

interface QuestionResponse {
  questions: MCQuestion[];
  questionStatus?: AnswerStatus[];
}

export default async function MCQuestionCard({
  articleId,
}: {
  articleId: string;
}) {
  const questionsData: QuestionResponse = await getQuestionsWithArticleId(
    articleId,
    ActivityType.MC_Question
  );

  if (!questionsData.questions) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
            Multiple Choice Questions
          </CardTitle>
          <CardDescription className="text-red-500 dark:text-red-400">
            There was an error getting the question.
          </CardDescription>
          <Skeleton className="h-8 w-full mt-2" />
        </CardHeader>
      </Card>
    );
  }

  if (questionsData.questions) {
    return (
      <Card className="w-full">
        <QuestionHeader
          heading="Multiple Choice Questions"
          description="Take the quiz to check your understanding"
          buttonLabel="Start Quiz"
          disabled={false}
        >
          <QuizContextProvider>
            <MCQuestionContent questions={questionsData.questions} />
          </QuizContextProvider>
        </QuestionHeader>
      </Card>
    );
  }
}
