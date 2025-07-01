"use client";

import { QuizContext } from "@/contexts/question-context";
import React, { useContext, useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LAQuestion } from "@/types";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ActivityType } from "@/types/enum";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Icons } from "@/components/icons";
import { finishQuiz, getFeedback } from "@/actions/question";
import { useLocale, useTranslations } from "next-intl";

interface FeedbackData {
  feedback: {
    detailedFeedback: {
      [key: string]: {
        areasForImprovement: string;
        examples: string;
        strengths: string;
        suggestions: string;
      };
    };
    score: {
      [key: string]: number;
    };
    overallImpression: string;
    exampleRevisions: string;
    nextSteps?: string[];
  };

  answer?: string;
}

export default function LAQuestionContent({
  articleId,
  questions,
}: {
  articleId: string;
  questions: LAQuestion;
}) {
  const { timer, setPaused } = useContext(QuizContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const user = useCurrentUser();
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isPanding, startTransition] = useTransition();
  const locale = useLocale();
  const t = useTranslations("Question");
  const tc = useTranslations("Components");

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(selectedCategory === category ? "" : category);
  };

  const longAnswerSchema = z.object({
    answer: z
      .string()
      .trim()
      .min((user?.level as number) * 30, {
        message: `Please Enter minimum ${
          (user?.level as number) * 30
        } character...`,
      })
      .max(2000, { message: "Answer must be less than 2000 characters..." }),
    method: z.string(),
  });

  const form = useForm<z.infer<typeof longAnswerSchema>>({
    resolver: zodResolver(longAnswerSchema),
    defaultValues: {
      answer: "",
      method: "feedback",
    },
  });

  const handleSubmit = (value: z.infer<typeof longAnswerSchema>) => {
    startTransition(async () => {
      await getFeedback({
        data: {
          articleId: questions.articleId,
          question: questions.question,
          answer: value.answer,
          preferredLanguage: locale,
        },
        activityType: ActivityType.LA_QUESTION,
      }).then((res) => {
        setFeedback({ ...(res as FeedbackData), answer: value.answer });
        setOpenModal(true);
      });
    });
  };

  const handleFinishQuiz = async () => {
    setPaused(true);
    const score = Object.values(feedback?.feedback?.score ?? {}).reduce(
      (acc, curr) => acc + curr,
      0,
    );
    const data = {
      feedback: JSON.stringify(feedback?.feedback),
      score,
      question: questions.question,
      yourAnswer: form.getValues("answer"),
      timer: timer,
    };

    startTransition(async () => {
      await finishQuiz(articleId, data, ActivityType.LA_QUESTION).then(
        (res) => {
          if (res.success) {
            toast.success("Quiz finished");
            setOpenModal(false);
            router.refresh();
          } else {
            toast.error(res.error);
          }
        },
      );
    });
  };

  return (
    <CardContent>
      <Form {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <div className="flex items-end gap-2">
            <Badge className="flex-1 justify-start" variant="destructive">
              {tc("timer", { elapsed: timer })}
            </Badge>
          </div>
          <CardTitle className="text-3xl font-bold md:text-3xl">
            {t("LAQuestion.title")}
          </CardTitle>
          <CardDescription className="text-2xl md:text-2xl">
            {questions?.question}
          </CardDescription>
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TextareaAutosize
                    {...field}
                    placeholder="Type your answer here..."
                    className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full resize-none rounded-md border bg-transparent px-3 py-2 shadow-xs transition-[color,box-shadow] outline-none focus:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex space-x-2">
            <Button
              type="submit"
              disabled={isPanding || form.getValues("method") === "submit"}
              size={"sm"}
            >
              {isPanding && form.getValues("method") === "feedback" && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              {tc("getFeedback")}
            </Button>
            <Button
              type="submit"
              size={"sm"}
              disabled={isPanding || form.getValues("method") === "feedback"}
            >
              {isPanding && form.getValues("method") === "submit" && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              {tc("submitButton")}
            </Button>
          </div>

          <AlertDialog open={openModal} onOpenChange={setOpenModal}>
            <AlertDialogContent className="sm:max-w-[425px]">
              <AlertDialogHeader className="text-left">
                <AlertDialogTitle className="text-2xl font-bold">
                  {form.getValues("method") === "feedback"
                    ? "Feedback and your score"
                    : "Final Feedback and your score"}
                </AlertDialogTitle>
              </AlertDialogHeader>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  className="rounded-full"
                  size="sm"
                  onClick={() => handleCategoryChange("vocabularyUse")}
                  variant={
                    selectedCategory === "vocabularyUse" ? "default" : "outline"
                  }
                >
                  vocabulary
                  {/* {t("feedbackModal.vocabulary")} */}
                </Button>
                <Button
                  className="rounded-full"
                  size="sm"
                  onClick={() => handleCategoryChange("grammarAccuracy")}
                  variant={
                    selectedCategory === "grammarAccuracy"
                      ? "default"
                      : "outline"
                  }
                >
                  grammar
                  {/* {t("feedbackModal.grammar")} */}
                </Button>
                <Button
                  className="rounded-full"
                  size="sm"
                  onClick={() => handleCategoryChange("clarityAndCoherence")}
                  variant={
                    selectedCategory === "clarityAndCoherence"
                      ? "default"
                      : "outline"
                  }
                >
                  clarityandcoherence
                  {/* {t("feedbackModal.clarityandcoherence")} */}
                </Button>
                <Button
                  className="rounded-full"
                  size="sm"
                  onClick={() => handleCategoryChange("complexityAndStructure")}
                  variant={
                    selectedCategory === "complexityAndStructure"
                      ? "default"
                      : "outline"
                  }
                >
                  complexityandstructure
                  {/* {t("feedbackModal.complexityandstructure")} */}
                </Button>
                <Button
                  className="rounded-full"
                  size="sm"
                  onClick={() => handleCategoryChange("contentAndDevelopment")}
                  variant={
                    selectedCategory === "contentAndDevelopment"
                      ? "default"
                      : "outline"
                  }
                >
                  contentanddevelopment
                  {/* {t("feedbackModal.contentanddevelopment")} */}
                </Button>
              </div>
              {selectedCategory && feedback?.feedback?.detailedFeedback && (
                <>
                  <AlertDialogDescription className="flex flex-col gap-2">
                    <div>
                      <p className="text-lg">
                        areaforimpovement
                        {/* {t("feedbackModal.areaforimpovement")} */}
                      </p>
                      <p>
                        {
                          feedback.feedback.detailedFeedback[selectedCategory]
                            ?.areasForImprovement
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-lg">
                        examples
                        {/* {t("feedbackModal.examples")} */}
                      </p>
                      <p>
                        {
                          feedback.feedback.detailedFeedback[selectedCategory]
                            ?.examples
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-lg">
                        strength
                        {/* {t("feedbackModal.strength")} */}
                      </p>
                      <p>
                        {
                          feedback.feedback.detailedFeedback[selectedCategory]
                            ?.strengths
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-lg">
                        suggestions
                        {/* {t("feedbackModal.suggestions")} */}
                      </p>
                      <p>
                        {
                          feedback.feedback.detailedFeedback[selectedCategory]
                            ?.suggestions
                        }
                      </p>
                    </div>
                  </AlertDialogDescription>
                  <div>
                    <p className="inline font-bold text-green-500 dark:text-green-400">
                      {/* {t("feedbackModal.score")}{" "} */}
                      Score :{feedback.feedback.score[selectedCategory]}
                    </p>
                  </div>
                </>
              )}
              {!selectedCategory && (
                <div className="flex flex-grow flex-col gap-2 overflow-y-auto pr-4">
                  <p className="text-bold text-xl">
                    overallImpression
                    {/* {t("feedbackModal.feedbackoverall")} */}
                  </p>
                  <p className="text-sm">
                    {feedback?.feedback.overallImpression}
                  </p>

                  {form.getValues("method") === "feedback" ? (
                    <>
                      <p className="text-bold text-xl">
                        exampleRevisions
                        {/* {t("feedbackModal.examplerevisions")} */}
                      </p>
                      <p className="text-sm">
                        {feedback?.feedback.exampleRevisions}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-bold text-xl">
                        nextStep
                        {/* {t("feedbackModal.nextStep")} */}
                      </p>
                      <div className="text-sm">
                        {feedback?.feedback.nextSteps?.map((item, index) => (
                          <p key={index}>
                            {index + 1}.{item}
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <AlertDialogFooter className="flex-shrink-0">
                {form.getValues("method") === "feedback" ? (
                  <Button
                    onClick={() => {
                      form.setValue("method", "submit");
                      setOpenModal(false);
                      setSelectedCategory("");
                    }}
                  >
                    {/* {t("feedbackModal.reviseResponse")} */}
                    reviseResponse
                  </Button>
                ) : (
                  <Button
                    disabled={isPanding}
                    onClick={() => handleFinishQuiz()}
                  >
                    {/* {t("feedbackModal.getXP")} */}
                    Get XP
                  </Button>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      </Form>
    </CardContent>
  );
}
