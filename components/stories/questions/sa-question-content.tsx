"use client";
import { QuizContext } from "@/contexts/question-context";
import React, { useContext, useState, useEffect } from "react";
import { CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Icons } from "@/components/icons";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import {
  ShortAnswerQuestion as SAQuestionType,
  ChapterActivityStatus,
} from "@/types/story";
import { useStorySAQ } from "@/hooks/use-story-saq-laq";
import { QuestionState, UserXpEarned } from "@/types/enum";
import { cn } from "@/lib/utils";
import { Sparkles, Timer, MessageSquare, CheckCircle2 } from "lucide-react";

// ==================== Types ====================

interface SAQuestionContentProps {
  questions: SAQuestionType[];
  chapterId: string;
  storyId: string;
  chapterNumber: number;
  activity: ChapterActivityStatus;
}

interface QuizResult {
  score: number;
  xpEarned: number;
  timer: number;
  feedback: string;
  answer: string;
}

// Helper function to format time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Reusable Result Card Component
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

// Score emoji helper
function getScoreEmoji(score: number) {
  if (score === 5) return "🌟";
  if (score === 4) return "⭐";
  if (score === 3) return "👍";
  if (score === 2) return "💪";
  return "📚";
}

export default function SAQuestionContent({
  questions,
  chapterId,
  storyId,
  chapterNumber,
  activity,
}: SAQuestionContentProps) {
  const { timer, setPaused } = useContext(QuizContext);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const t = useTranslations("Question");
  const tc = useTranslations("Components");

  // State for quiz status
  const [quizState, setQuizState] = useState<QuestionState>(() => {
    if (activity.isShortAnswerCompleted) {
      return QuestionState.COMPLETED;
    }
    return QuestionState.INCOMPLETE;
  });

  // Quiz result (from previous attempt or just completed)
  const [quizResult, setQuizResult] = useState<QuizResult | null>(() => {
    if (activity.isShortAnswerCompleted && activity.saScore !== null) {
      return {
        score: activity.saScore ?? 0,
        xpEarned: (activity.saScore ?? 0) * UserXpEarned.SAQuestion,
        timer: activity.saTimer ?? 0,
        feedback: activity.saFeedback ?? "",
        answer: activity.saAnswer ?? "",
      };
    }
    return null;
  });

  // Temporary feedback state (before submit)
  const [tempFeedback, setTempFeedback] = useState<{
    score: number;
    feedback: string;
  } | null>(null);

  // Form schema
  const formSchema = z.object({
    answer: z
      .string()
      .trim()
      .min(1, { message: t("SAQuestion.anwserError") }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      answer: "",
    },
  });

  // Use custom hook for mutations
  const { getFeedback, submitSAQ, isGettingFeedback, isSubmitting } =
    useStorySAQ({
      storyId,
      chapterNumber,
      chapterId,
      onSubmitSuccess: (result) => {
        setQuizResult({
          score: result.score,
          xpEarned: result.xpEarned,
          timer: result.timer,
          feedback: tempFeedback?.feedback ?? "",
          answer: form.getValues("answer"),
        });
        setQuizState(QuestionState.COMPLETED);
        setJustCompleted(true);
        setShowConfetti(true);
        setIsOpenModal(false);
        setTimeout(() => setShowConfetti(false), 3000);
      },
    });

  // Pause timer if already completed
  useEffect(() => {
    if (activity.isShortAnswerCompleted) {
      setPaused(true);
    }
  }, [activity.isShortAnswerCompleted, setPaused]);

  // Get the current question
  const currentQuestion = questions[0];

  // Handle form submission - get AI feedback
  const handleGetFeedback = async (values: z.infer<typeof formSchema>) => {
    setPaused(true);
    try {
      const feedback = await getFeedback({
        question: currentQuestion.question,
        answer: values.answer,
        suggestedResponse: currentQuestion.answer,
        preferredLanguage: "English",
      });
      setTempFeedback(feedback);
      setIsOpenModal(true);
    } catch {
      setPaused(false);
    }
  };

  // Handle finish - save to database
  const handleFinishQuiz = () => {
    if (!tempFeedback) return;

    submitSAQ({
      question: currentQuestion.question,
      answer: form.getValues("answer"),
      score: tempFeedback.score,
      feedback: tempFeedback.feedback,
      timer: timer,
    });
  };

  // Handle close modal without saving
  const handleCloseModal = () => {
    setIsOpenModal(false);
    setPaused(false);
    setTempFeedback(null);
  };

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
                🎉 {t("SAQuestion.congratulations")} 🎉
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                {t("SAQuestion.quizCompletedMessage")}
              </p>
            </div>
          </div>

          {/* Results Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <ResultCard
              emoji={getScoreEmoji(quizResult.score)}
              value={`${quizResult.score}/5`}
              label={t("SAQuestion.scoreLabel")}
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
                    {t("SAQuestion.feedback")}
                  </p>
                  <p className="mt-1 text-sm text-blue-700 sm:text-base">
                    {quizResult.feedback}
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
                    {t("SAQuestion.yourAnswer")}
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
            {t("SAQuestion.completed")}
          </h3>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-3 gap-3">
          <ResultCard
            emoji={getScoreEmoji(quizResult.score)}
            value={`${quizResult.score}/5`}
            label={t("SAQuestion.scoreLabel")}
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
            label={t("SAQuestion.timeSpent")}
            colorClass="from-orange-50 to-orange-100 text-orange-600 [&_p:last-child]:text-orange-700"
            size="sm"
          />
        </div>

        {/* Your Answer */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="mb-1 text-xs font-medium text-green-800">
            {t("SAQuestion.yourAnswer")}
          </p>
          <p className="text-sm text-green-700">{quizResult.answer}</p>
        </div>

        {/* AI Feedback */}
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
          <p className="mb-1 text-xs font-medium text-purple-800">
            {t("SAQuestion.feedback")}
          </p>
          <p className="text-sm text-purple-700">{quizResult.feedback}</p>
        </div>
      </CardContent>
    );
  }

  // ==================== QUIZ IN PROGRESS ====================
  return (
    <CardContent className="space-y-4 p-4 sm:p-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleGetFeedback)}
          className="flex flex-col gap-4"
        >
          {/* Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📝</span>
              <CardTitle className="text-xl font-bold md:text-2xl">
                {t("SAQuestion.title")}
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
                  <Input
                    {...field}
                    placeholder={t("SAQuestion.answerPlaceholder")}
                    className="px-4 py-6 text-lg"
                    disabled={isGettingFeedback}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="flex justify-center pt-2">
            <Button
              type="submit"
              disabled={isGettingFeedback}
              size="lg"
              className="gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-8 text-lg font-bold shadow-lg transition-all hover:scale-105"
            >
              {isGettingFeedback ? (
                <>
                  <Icons.spinner className="h-5 w-5 animate-spin" />
                  {t("SAQuestion.checking")}
                </>
              ) : (
                <>✨ {tc("submitButton")}</>
              )}
            </Button>
          </div>

          <p className="text-muted-foreground text-center text-sm">
            💡 {t("SAQuestion.hint")}
          </p>

          {/* Feedback Alert Dialog */}
          <AlertDialog open={isOpenModal} onOpenChange={setIsOpenModal}>
            <AlertDialogContent className="max-w-md sm:max-w-lg">
              <AlertDialogHeader className="text-left">
                <AlertDialogTitle className="flex items-center gap-2 text-2xl font-bold">
                  <span className="text-3xl">
                    {getScoreEmoji(tempFeedback?.score ?? 0)}
                  </span>
                  {t("SAQuestion.feedbackAndYourScore")}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4 pt-2">
                    {/* Score Badge */}
                    <div className="flex justify-center">
                      <div
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-6 py-3 text-2xl font-bold",
                          tempFeedback?.score && tempFeedback.score >= 4
                            ? "bg-green-100 text-green-600"
                            : tempFeedback?.score && tempFeedback.score >= 3
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-red-100 text-red-600",
                        )}
                      >
                        {t("SAQuestion.score", {
                          score: tempFeedback?.score ?? 0,
                        })}
                      </div>
                    </div>

                    {/* Question */}
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-medium text-gray-500">
                        {t("SAQuestion.question")}
                      </p>
                      <p className="text-gray-800">
                        {currentQuestion.question}
                      </p>
                    </div>

                    {/* Your Answer */}
                    <div className="rounded-xl bg-blue-50 p-3">
                      <p className="mb-1 text-xs font-medium text-blue-600">
                        {t("SAQuestion.yourAnswer")}
                      </p>
                      <p className="font-medium text-blue-800">
                        {form.getValues("answer")}
                      </p>
                    </div>

                    {/* Suggested Answer */}
                    <div className="rounded-xl bg-green-50 p-3">
                      <p className="mb-1 text-xs font-medium text-green-600">
                        {t("SAQuestion.suggestedAnswer")}
                      </p>
                      <p className="text-green-800">{currentQuestion.answer}</p>
                    </div>

                    {/* AI Feedback */}
                    <div className="rounded-xl bg-purple-50 p-3">
                      <p className="mb-1 text-xs font-medium text-purple-600">
                        {t("SAQuestion.feedback")}
                      </p>
                      <p className="text-purple-800">
                        {tempFeedback?.feedback}
                      </p>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button
                  onClick={handleFinishQuiz}
                  disabled={isSubmitting}
                  className="w-full gap-2 bg-gradient-to-r from-green-500 to-green-600"
                >
                  {isSubmitting ? (
                    <>
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                      {tc("submitting")}
                    </>
                  ) : (
                    <>🏁 {tc("finishButton")}</>
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
