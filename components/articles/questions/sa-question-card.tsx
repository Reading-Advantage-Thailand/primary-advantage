import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getQuestionsWithArticleId } from "@/server/models/articles";
import { ActivityType } from "@/types/enum";
import SAQuestionContent from "./sa-question-content";
import QuestionHeader from "./question-header";
import { QuizContextProvider } from "@/contexts/question-context";

export default async function SAQuestionCard({
  articleId,
}: {
  articleId: string;
}) {
  const Data = await getQuestionsWithArticleId(
    articleId,
    ActivityType.SA_Question
  );

  if (!Data.questions) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
            Short Answer Questions
          </CardTitle>
          <CardDescription className="text-red-500 dark:text-red-400">
            There was an error getting the question.
          </CardDescription>
          <Skeleton className="h-8 w-full mt-2" />
        </CardHeader>
      </Card>
    );
  }

  if (Data.questions) {
    return (
      <Card className="w-full">
        <QuestionHeader
          heading="Short Answer Questions"
          description="Take the quiz to check your understanding"
          buttonLabel="Start Quiz"
          disabled={false}
        >
          <QuizContextProvider>
            <SAQuestionContent data={Data.questions} />
          </QuizContextProvider>
        </QuestionHeader>
      </Card>
    );
  }
}
