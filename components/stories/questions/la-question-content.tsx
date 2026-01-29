"use client";

import { QuizContext } from "@/contexts/question-context";
import React, { useContext, useState, useEffect } from "react";
import { CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Icons } from "@/components/icons";
import { useLocale, useTranslations } from "next-intl";
import { convertLocaleFull, cn } from "@/lib/utils";
import {
  LongAnswerQuestion as LAQuestionType,
  ChapterActivityStatus,
} from "@/types/story";
import { useStoryLAQ } from "@/hooks/use-story-saq-laq";
import { QuestionState, UserXpEarned } from "@/types/enum";
import { Sparkles, Timer, MessageSquare, CheckCircle2 } from "lucide-react";

// ==================== Constants ====================

const MAX_FEEDBACK_ATTEMPTS = 2;

const FEEDBACK_CATEGORIES = [
  { key: "vocabularyUse", translationKey: "vocabulary" },
  { key: "grammarAccuracy", translationKey: "grammar" },
  { key: "clarityAndCoherence", translationKey: "clarityandcoherence" },
  { key: "complexityAndStructure", translationKey: "complexityandstructure" },
  { key: "contentAndDevelopment", translationKey: "contentanddevelopment" },
] as const;

// ==================== Types ====================
// Match actual API response structure from laqFeedbackOutputSchema

interface LAQFeedbackDetail {
  strengths: string;
  areasForImprovement: string;
  examples: string;
  suggestions: string;
}

interface LAQFeedbackData {
  scores: {
    vocabularyUse: number;
    grammarAccuracy: number;
    clarityAndCoherence: number;
    complexityAndStructure: number;
    contentAndDevelopment: number;
    [key: string]: number;
  };
  overallImpression: string;
  detailedFeedback: {
    vocabularyUse: LAQFeedbackDetail;
    grammarAccuracy: LAQFeedbackDetail;
    clarityAndCoherence: LAQFeedbackDetail;
    complexityAndStructure: LAQFeedbackDetail;
    contentAndDevelopment: LAQFeedbackDetail;
    [key: string]: LAQFeedbackDetail;
  };
  exampleRevisions: string[];
  nextSteps: string[];
}

interface LAQuestionContentProps {
  questions: LAQuestionType[];
  chapterId: string;
  storyId: string;
  chapterNumber: number;
  activity: ChapterActivityStatus;
}

interface QuizResult {
  score: number;
  xpEarned: number;
  timer: number;
  feedback: LAQFeedbackData | null;
  answer: string;
}

// ==================== Helper Functions ====================

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

interface ResultCardProps {
  emoji: string;
  value: string | number;
  label: string;
  colorClass: string;
  size?: "sm" | "lg";
}

function ResultCard({
  emoji,
  value,
  label,
  colorClass,
  size = "lg",
}: ResultCardProps) {
  const isLarge = size === "lg";
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-br text-center shadow-sm",
        isLarge ? "rounded-2xl p-4" : "p-3",
        colorClass,
      )}
    >
      <div className={isLarge ? "text-3xl sm:text-4xl" : "text-2xl"}>
        {emoji}
      </div>
      <p
        className={cn(
          "mt-1 font-bold",
          isLarge ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
        )}
      >
        {value}
      </p>
      <p className={cn("text-xs", isLarge && "sm:text-sm")}>{label}</p>
    </div>
  );
}

function getScoreEmoji(score: number, maxScore: number = 25) {
  const percentage = score / maxScore;
  if (percentage >= 0.9) return "🌟";
  if (percentage >= 0.7) return "⭐";
  if (percentage >= 0.5) return "👍";
  if (percentage >= 0.3) return "💪";
  return "📚";
}

function calculateTotalScore(feedback: LAQFeedbackData | null): number {
  if (!feedback?.scores) return 0;
  return Object.values(feedback.scores).reduce((acc, curr) => acc + curr, 0);
}

// ==================== Main Component ====================

export default function LAQuestionContent({
  questions,
  chapterId,
  storyId,
  chapterNumber,
  activity,
}: LAQuestionContentProps) {
  const { timer, setPaused } = useContext(QuizContext);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const user = useCurrentUser();
  const locale = useLocale();
  const t = useTranslations("Question");
  const tc = useTranslations("Components");
  const tfq = useTranslations("Question.LAQuestion.feedbackModal");

  // Feedback attempt counter (max 2)
  const [feedbackAttempts, setFeedbackAttempts] = useState(0);

  // State for quiz status
  const [quizState, setQuizState] = useState<QuestionState>(() => {
    if (activity.isLongAnswerCompleted) {
      return QuestionState.COMPLETED;
    }
    return QuestionState.INCOMPLETE;
  });

  // Quiz result (from previous attempt or just completed)
  const [quizResult, setQuizResult] = useState<QuizResult | null>(() => {
    if (activity.isLongAnswerCompleted && activity.laScore !== null) {
      // laFeedback could be stored as JSON string or object
      let parsedFeedback: LAQFeedbackData | null = null;
      if (activity.laFeedback) {
        try {
          parsedFeedback =
            typeof activity.laFeedback === "string"
              ? JSON.parse(activity.laFeedback)
              : activity.laFeedback;
        } catch {
          parsedFeedback = null;
        }
      }
      return {
        score: activity.laScore ?? 0,
        xpEarned: (activity.laScore ?? 0) * UserXpEarned.LAQuestion,
        timer: activity.laTimer ?? 0,
        feedback: parsedFeedback,
        answer: activity.laAnswer ?? "",
      };
    }
    return null;
  });

  // Temporary feedback state (before submit)
  const [tempFeedback, setTempFeedback] = useState<LAQFeedbackData | null>(
    null,
  );

  // Animation states
  const [justCompleted, setJustCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Form schema
  const minChars = (user?.level ?? 1) * 30;
  const longAnswerSchema = z.object({
    answer: z
      .string()
      .trim()
      .min(minChars, {
        message: t("LAQuestion.minCharError", { min: minChars }),
      })
      .max(2000, {
        message: t("LAQuestion.maxCharError"),
      }),
  });

  const form = useForm<z.infer<typeof longAnswerSchema>>({
    resolver: zodResolver(longAnswerSchema),
    defaultValues: {
      answer: "",
    },
  });

  // Use custom hook for mutations
  const { getFeedback, submitLAQ, isGettingFeedback, isSubmitting } =
    useStoryLAQ({
      storyId,
      chapterNumber,
      chapterId,
      onSubmitSuccess: (result) => {
        setQuizResult({
          score: result.score,
          xpEarned: result.xpEarned,
          timer: result.timer,
          feedback: tempFeedback,
          answer: form.getValues("answer"),
        });
        setQuizState(QuestionState.COMPLETED);
        setJustCompleted(true);
        setShowConfetti(true);
        setOpenModal(false);
        setTimeout(() => setShowConfetti(false), 3000);
      },
    });

  // Pause timer if already completed
  useEffect(() => {
    if (activity.isLongAnswerCompleted) {
      setPaused(true);
    }
  }, [activity.isLongAnswerCompleted, setPaused]);

  const currentQuestion = questions[0];

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(selectedCategory === category ? "" : category);
  };

  // Handle get AI feedback
  const handleGetFeedback = async (
    values: z.infer<typeof longAnswerSchema>,
  ) => {
    if (feedbackAttempts >= MAX_FEEDBACK_ATTEMPTS) return;

    setPaused(true);
    try {
      const response = await getFeedback({
        question: currentQuestion.question,
        answer: values.answer,
        preferredLanguage: convertLocaleFull(locale),
      });
      // API returns feedback object directly (matching laqFeedbackOutputSchema.feedback)
      setTempFeedback(response as unknown as LAQFeedbackData);
      setFeedbackAttempts((prev) => prev + 1);
      setOpenModal(true);
    } catch {
      setPaused(false);
    }
  };

  // Handle submit to database
  const handleFinishQuiz = () => {
    if (!tempFeedback) return;

    const totalScore = calculateTotalScore(tempFeedback);

    submitLAQ({
      question: currentQuestion.question,
      answer: form.getValues("answer"),
      score: totalScore,
      feedback: tempFeedback,
      timer: timer,
    });
  };

  // Handle close modal without saving (try again)
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedCategory("");
    setPaused(false);
    // Keep tempFeedback so user can still submit later
  };

  // Calculate remaining feedback attempts
  const remainingAttempts = MAX_FEEDBACK_ATTEMPTS - feedbackAttempts;
  const canGetMoreFeedback = remainingAttempts > 0;
  const hasReceivedFeedback = tempFeedback !== null;

  // ==================== COMPLETED STATE ====================
  if (quizState === QuestionState.COMPLETED && quizResult) {
    // Just completed - Celebration UI
    if (justCompleted) {
      return (
        <CardContent className="relative overflow-hidden p-4 sm:p-6">
          {/* Confetti Animation */}
          {showConfetti && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-bounce text-2xl"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                  }}
                >
                  {
                    ["⭐", "🎉", "✨", "🌟", "💫"][
                      Math.floor(Math.random() * 5)
                    ]
                  }
                </div>
              ))}
            </div>
          )}

          {/* Trophy Section */}
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg sm:h-32 sm:w-32">
                <span className="text-5xl sm:text-6xl">🏆</span>
              </div>
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 animate-pulse text-yellow-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-yellow-600 sm:text-3xl">
                🎉 {t("LAQuestion.congratulations")} 🎉
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                {t("LAQuestion.quizCompletedMessage")}
              </p>
            </div>
          </div>

          {/* Results Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <ResultCard
              emoji={getScoreEmoji(quizResult.score)}
              value={`${quizResult.score}/25`}
              label={t("LAQuestion.scoreLabel")}
              colorClass="from-green-100 to-green-200 text-green-600 [&_p:last-child]:text-green-700"
            />
            <ResultCard
              emoji="⭐"
              value={`+${quizResult.xpEarned}`}
              label="XP"
              colorClass="from-purple-100 to-purple-200 text-purple-600 [&_p:last-child]:text-purple-700"
            />
          </div>

          {/* Time Spent */}
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-orange-600">
              <Timer className="h-5 w-5" />
              <span className="font-mono font-bold">
                {formatTime(quizResult.timer)}
              </span>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-800">
                    {tfq("feedbackoverall")}
                  </p>
                  <p className="mt-1 text-sm text-blue-700 sm:text-base">
                    {quizResult.feedback?.overallImpression}
                  </p>
                </div>
              </div>
            </div>

            {/* Your Answer */}
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-semibold text-green-800">
                    {t("LAQuestion.yourAnswer")}
                  </p>
                  <p className="mt-1 text-sm text-green-700 sm:text-base">
                    {quizResult.answer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      );
    }

    // Previously completed - Summary UI
    return (
      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Header with trophy */}
        <div className="flex items-center justify-center gap-2 text-center">
          <span className="text-3xl">🏆</span>
          <h3 className="text-xl font-bold text-green-600 sm:text-2xl">
            {t("LAQuestion.completed")}
          </h3>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-3 gap-3">
          <ResultCard
            emoji={getScoreEmoji(quizResult.score)}
            value={`${quizResult.score}/25`}
            label={t("LAQuestion.scoreLabel")}
            colorClass="from-green-50 to-green-100 text-green-600 [&_p:last-child]:text-green-700"
            size="sm"
          />
          <ResultCard
            emoji="⭐"
            value={`+${quizResult.xpEarned}`}
            label="XP"
            colorClass="from-purple-50 to-purple-100 text-purple-600 [&_p:last-child]:text-purple-700"
            size="sm"
          />
          <ResultCard
            emoji="⏱️"
            value={formatTime(quizResult.timer)}
            label={t("LAQuestion.timeSpent")}
            colorClass="from-orange-50 to-orange-100 text-orange-600 [&_p:last-child]:text-orange-700"
            size="sm"
          />
        </div>

        {/* Your Answer */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="mb-1 text-xs font-medium text-green-800">
            {t("LAQuestion.yourAnswer")}
          </p>
          <p className="text-sm text-green-700">{quizResult.answer}</p>
        </div>

        {/* AI Feedback */}
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
          <p className="mb-1 text-xs font-medium text-purple-800">
            {tfq("feedbackoverall")}
          </p>
          <p className="text-sm text-purple-700">
            {quizResult.feedback?.overallImpression}
          </p>
        </div>

        {/* Next Steps */}
        {quizResult.feedback?.nextSteps &&
          quizResult.feedback.nextSteps.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
              <p className="mb-1 text-xs font-medium text-orange-800">
                {tfq("nextStep")}
              </p>
              <ul className="text-sm text-orange-700">
                {quizResult.feedback.nextSteps.map((step, index) => (
                  <li key={index}>
                    {index + 1}. {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </CardContent>
    );
  }

  // ==================== QUIZ IN PROGRESS ====================
  return (
    <CardContent className="space-y-4 p-4 sm:p-6">
      <Form {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(handleGetFeedback)}
        >
          {/* Timer and Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">✍️</span>
              <CardTitle className="text-xl font-bold md:text-2xl">
                {t("LAQuestion.title")}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-orange-600">
              <Timer className="h-4 w-4" />
              <span className="font-mono font-bold">{formatTime(timer)}</span>
            </div>
          </div>

          {/* Question */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
            <h3 className="text-center text-lg leading-relaxed font-semibold text-gray-800 sm:text-xl">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Answer Input */}
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TextareaAutosize
                    {...field}
                    placeholder={t("LAQuestion.answerPlaceholder")}
                    className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-32 w-full resize-none rounded-md border bg-transparent px-3 py-2 shadow-xs transition-[color,box-shadow] outline-none focus:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    disabled={isGettingFeedback || isSubmitting}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-muted-foreground text-xs">
                  {t("LAQuestion.minCharHint", { min: minChars })} (
                  {form.watch("answer").length}/{minChars})
                </p>
              </FormItem>
            )}
          />

          {/* Feedback Counter */}
          {feedbackAttempts > 0 && (
            <div className="text-center text-sm text-amber-600">
              {t("LAQuestion.feedbackRemaining", { count: remainingAttempts })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {/* Get Feedback Button - disabled when max attempts reached */}
            <Button
              type="submit"
              disabled={
                isGettingFeedback || isSubmitting || !canGetMoreFeedback
              }
              variant={hasReceivedFeedback ? "outline" : "default"}
              size="lg"
              className={cn(
                "gap-2 rounded-full px-6 font-bold shadow-lg transition-all hover:scale-105",
                !hasReceivedFeedback &&
                  "bg-gradient-to-r from-blue-500 to-blue-600",
              )}
            >
              {isGettingFeedback ? (
                <>
                  <Icons.spinner className="h-5 w-5 animate-spin" />
                  {t("LAQuestion.gettingFeedback")}
                </>
              ) : (
                <>
                  ✨ {tc("getFeedback")}
                  {canGetMoreFeedback && ` (${remainingAttempts})`}
                </>
              )}
            </Button>

            {/* Direct Submit Button - only show after getting feedback */}
            {hasReceivedFeedback && (
              <Button
                type="button"
                onClick={() => setOpenModal(true)}
                disabled={isSubmitting}
                size="lg"
                className="gap-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-6 font-bold shadow-lg transition-all hover:scale-105"
              >
                🏁 {tc("submitButton")}
              </Button>
            )}
          </div>

          <p className="text-muted-foreground text-center text-sm">
            💡 {t("LAQuestion.hint")}
          </p>

          {/* Feedback Modal */}
          <AlertDialog open={openModal} onOpenChange={setOpenModal}>
            <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
              <AlertDialogHeader className="text-left">
                <AlertDialogTitle className="flex items-center gap-2 text-2xl font-bold">
                  <span className="text-3xl">
                    {getScoreEmoji(calculateTotalScore(tempFeedback))}
                  </span>
                  {tfq("title")}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4 pt-2">
                    {/* Total Score Badge */}
                    <div className="flex justify-center">
                      <div
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-6 py-3 text-2xl font-bold",
                          calculateTotalScore(tempFeedback) >= 20
                            ? "bg-green-100 text-green-600"
                            : calculateTotalScore(tempFeedback) >= 15
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-red-100 text-red-600",
                        )}
                      >
                        {tfq("totalScore")}: {calculateTotalScore(tempFeedback)}
                        /25
                      </div>
                    </div>

                    {/* Category Buttons */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {FEEDBACK_CATEGORIES.map(({ key, translationKey }) => (
                        <Button
                          key={key}
                          className="rounded-full"
                          size="sm"
                          type="button"
                          onClick={() => handleCategoryChange(key)}
                          variant={
                            selectedCategory === key ? "default" : "outline"
                          }
                        >
                          {tfq(translationKey)}
                          <Badge variant="secondary" className="ml-1">
                            {tempFeedback?.scores?.[key] ?? 0}
                          </Badge>
                        </Button>
                      ))}
                    </div>

                    {/* Category Detail */}
                    {selectedCategory && tempFeedback?.detailedFeedback && (
                      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div>
                          <h4 className="font-semibold text-red-600">
                            {tfq("areaforimpovement")}
                          </h4>
                          <p className="text-sm text-gray-700">
                            {
                              tempFeedback.detailedFeedback[selectedCategory]
                                ?.areasForImprovement
                            }
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-600">
                            {tfq("examples")}
                          </h4>
                          <p className="text-sm text-gray-700">
                            {
                              tempFeedback.detailedFeedback[selectedCategory]
                                ?.examples
                            }
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-green-600">
                            {tfq("strength")}
                          </h4>
                          <p className="text-sm text-gray-700">
                            {
                              tempFeedback.detailedFeedback[selectedCategory]
                                ?.strengths
                            }
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-purple-600">
                            {tfq("suggestions")}
                          </h4>
                          <p className="text-sm text-gray-700">
                            {
                              tempFeedback.detailedFeedback[selectedCategory]
                                ?.suggestions
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Overall Feedback */}
                    {!selectedCategory && tempFeedback && (
                      <div className="space-y-3">
                        <div className="rounded-xl bg-blue-50 p-4">
                          <h4 className="font-semibold text-blue-800">
                            {tfq("feedbackoverall")}
                          </h4>
                          <p className="mt-1 text-sm text-blue-700">
                            {tempFeedback.overallImpression}
                          </p>
                        </div>

                        <div className="rounded-xl bg-amber-50 p-4">
                          <h4 className="font-semibold text-amber-800">
                            {tfq("examplerevisions")}
                          </h4>
                          <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                            {tempFeedback.exampleRevisions?.map((rev, idx) => (
                              <li key={idx}>{rev}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                {/* Revise Response Button */}
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {canGetMoreFeedback
                    ? tfq("reviseResponse")
                    : tfq("reviseResponseNoFeedback")}
                </Button>

                {/* Submit Button */}
                <Button
                  type="button"
                  onClick={handleFinishQuiz}
                  disabled={isSubmitting}
                  className="w-full gap-2 bg-gradient-to-r from-green-500 to-green-600 sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                      {tc("submitting")}
                    </>
                  ) : (
                    <>🏁 {tfq("getXP")}</>
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      </Form>
    </CardContent>
  );
}
