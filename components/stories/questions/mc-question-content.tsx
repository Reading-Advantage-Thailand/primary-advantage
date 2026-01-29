"use client";
import { QuizContext } from "@/contexts/question-context";
import React, { useContext, useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { AnswerStatus, QuestionState, UserXpEarned } from "@/types/enum";
import { RefreshCw, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  MultipleChoiceQuestion as MCQuestionType,
  ChapterActivityStatus,
} from "@/types/story";
import { useStoryQuiz } from "@/hooks/use-story-quiz";
import { Progress } from "@/components/ui/progress";

interface MCQuestionContentProps {
  questions: MCQuestionType[];
  chapterId: string;
  storyId: string;
  chapterNumber: number;
  activity: ChapterActivityStatus;
}

interface QuizResult {
  score: number;
  xpEarned: number;
  timer: number;
}

// Colorful option styles for kids
const OPTION_COLORS = [
  "from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600",
  "from-green-400 to-green-500 hover:from-green-500 hover:to-green-600",
  "from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600",
  "from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600",
];

// Helper function to shuffle array (Fisher-Yates algorithm)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

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

// Reusable Progress Indicator Component
interface ProgressIndicatorsProps {
  progress: AnswerStatus[];
  size?: "sm" | "lg";
}

function ProgressIndicators({
  progress,
  size = "lg",
}: ProgressIndicatorsProps) {
  const isLarge = size === "lg";
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {progress.map((status, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center justify-center rounded-full transition-transform hover:scale-110",
            isLarge ? "h-10 w-10 text-xl" : "h-8 w-8 text-sm",
            status === AnswerStatus.CORRECT
              ? "bg-green-100"
              : status === AnswerStatus.INCORRECT
                ? "bg-red-100"
                : "bg-gray-100",
          )}
        >
          {status === AnswerStatus.CORRECT
            ? "⭐"
            : status === AnswerStatus.INCORRECT
              ? "❌"
              : "⚪"}
        </div>
      ))}
    </div>
  );
}

export default function MCQuestionContent({
  questions,
  chapterId,
  storyId,
  chapterNumber,
  activity,
}: MCQuestionContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { timer, setPaused, setTimer } = useContext(QuizContext);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [progress, setProgress] = useState<AnswerStatus[]>(
    Array(questions.length).fill(AnswerStatus.UNANSWERED),
  );
  const [textualEvidence, setTextualEvidence] = useState("");
  const [justCompleted, setJustCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [quizState, setQuizState] = useState<QuestionState>(() => {
    if (activity.isMultipleChoiceCompleted) {
      return QuestionState.COMPLETED;
    }
    return QuestionState.INCOMPLETE;
  });

  const [quizResult, setQuizResult] = useState<QuizResult | null>(() => {
    if (activity.isMultipleChoiceCompleted && activity.mcScore !== null) {
      return {
        score: activity.mcScore ?? 0,
        xpEarned: (activity.mcScore ?? 0) * UserXpEarned.MCQuestion,
        timer: activity.mcTimer ?? 0,
      };
    }
    return null;
  });

  const t = useTranslations("Question");
  const tc = useTranslations("Components");

  // Use custom hook for mutations
  const { submitQuiz, retakeQuiz, isSubmitting, isRetaking } = useStoryQuiz({
    storyId,
    chapterNumber,
    chapterId,
    onSubmitSuccess: (result) => {
      setQuizResult(result);
      setQuizState(QuestionState.COMPLETED);
      setJustCompleted(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    },
    onRetakeSuccess: () => {
      setQuizState(QuestionState.INCOMPLETE);
      setCurrentIndex(0);
      setActiveQuestion(null);
      setResponses([]);
      setProgress(Array(questions.length).fill(AnswerStatus.UNANSWERED));
      setTextualEvidence("");
      setQuizResult(null);
      setJustCompleted(false);
      setTimer(0);
      setPaused(false);
    },
  });

  // Initialize progress from existing activity
  useEffect(() => {
    if (activity.isMultipleChoiceCompleted && activity.mcScore !== null) {
      setPaused(true);
      const correctCount = activity.mcScore ?? 0;
      const incorrectCount = questions.length - correctCount;
      const newProgress = [
        ...Array(correctCount).fill(AnswerStatus.CORRECT),
        ...Array(incorrectCount).fill(AnswerStatus.INCORRECT),
      ];
      setProgress(newProgress);
    }
  }, [activity, questions.length, setPaused]);

  useEffect(() => {
    if (questions[currentIndex]) {
      setShuffledOptions(shuffleArray(questions[currentIndex].options ?? []));
    }
  }, [questions, currentIndex]);

  const handleSelectOption = (option: string) => {
    if (activeQuestion) return;

    const isCorrect = option === questions[currentIndex].answer;

    setResponses((prev) => {
      const response = {
        question: questions[currentIndex].question,
        answer: option,
        isCorrect,
      };
      const existingIndex = prev.findIndex(
        (r) => r.question === response.question,
      );
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = response;
        return updated;
      }
      return [...prev, response];
    });

    setProgress((prev) => {
      const newProgress = [...prev];
      newProgress[currentIndex] = isCorrect
        ? AnswerStatus.CORRECT
        : AnswerStatus.INCORRECT;
      return newProgress;
    });

    setTextualEvidence(questions[currentIndex].textualEvidence || "");
    setActiveQuestion(option);
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setActiveQuestion(null);
      setTextualEvidence("");
    }
  };

  const handleFinishQuiz = () => {
    setPaused(true);
    const score = progress.filter((s) => s === AnswerStatus.CORRECT).length;
    submitQuiz({ responses, score, timer });
  };

  const correctCount = progress.filter(
    (s) => s === AnswerStatus.CORRECT,
  ).length;
  const totalQuestions = questions.length;
  const accuracy =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const progressPercent =
    ((currentIndex + (activeQuestion ? 1 : 0)) / totalQuestions) * 100;

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
                🎉 {t("MCQuestion.congratulations")} 🎉
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                {t("MCQuestion.quizCompletedMessage")}
              </p>
            </div>
          </div>

          {/* Results Cards - Kid-friendly */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <ResultCard
              emoji="✅"
              value={`${quizResult.score}/${totalQuestions}`}
              label={t("MCQuestion.correct")}
              colorClass="from-green-100 to-green-200 text-green-600 [&_p:last-child]:text-green-700"
            />
            <ResultCard
              emoji="📊"
              value={`${accuracy}%`}
              label={t("MCQuestion.accuracy")}
              colorClass="from-blue-100 to-blue-200 text-blue-600 [&_p:last-child]:text-blue-700"
            />
            <ResultCard
              emoji="⭐"
              value={`+${quizResult.xpEarned}`}
              label="XP"
              colorClass="from-purple-100 to-purple-200 text-purple-600 [&_p:last-child]:text-purple-700"
            />
            <ResultCard
              emoji="⏱️"
              value={formatTime(quizResult.timer)}
              label={t("MCQuestion.timeSpent")}
              colorClass="from-orange-100 to-orange-200 text-orange-600 [&_p:last-child]:text-orange-700"
            />
          </div>

          {/* Progress Stars */}
          <div className="mt-4">
            <ProgressIndicators progress={progress} size="lg" />
          </div>

          {/* Retake Button */}
          <div className="mt-6 flex justify-center">
            <Button
              onClick={retakeQuiz}
              disabled={isRetaking}
              variant="outline"
              size="lg"
              className="gap-2 rounded-full border-2 px-6"
            >
              <RefreshCw
                className={cn("h-5 w-5", isRetaking && "animate-spin")}
              />
              {isRetaking ? tc("retaking") : tc("retakeButton")}
            </Button>
          </div>
        </CardContent>
      );
    }

    // Previously completed - Enhanced Result UI
    return (
      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Header with trophy */}
        <div className="flex items-center justify-center gap-2 text-center">
          <span className="text-3xl">🏆</span>
          <h3 className="text-xl font-bold text-green-600 sm:text-2xl">
            {t("MCQuestion.completed")}
          </h3>
        </div>

        {/* Results Grid - Kid-friendly cards */}
        <div className="grid grid-cols-2 gap-3">
          <ResultCard
            emoji="✅"
            value={`${quizResult.score}/${totalQuestions}`}
            label={t("MCQuestion.correct")}
            colorClass="from-green-50 to-green-100 text-green-600 [&_p:last-child]:text-green-700"
            size="sm"
          />
          <ResultCard
            emoji="📊"
            value={`${accuracy}%`}
            label={t("MCQuestion.accuracy")}
            colorClass="from-blue-50 to-blue-100 text-blue-600 [&_p:last-child]:text-blue-700"
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
            label={t("MCQuestion.timeSpent")}
            colorClass="from-orange-50 to-orange-100 text-orange-600 [&_p:last-child]:text-orange-700"
            size="sm"
          />
        </div>

        {/* Progress indicators */}
        <ProgressIndicators progress={progress} size="sm" />

        {/* Retake Button - More prominent */}
        <div className="flex justify-center pt-2">
          <Button
            onClick={retakeQuiz}
            disabled={isRetaking}
            variant="outline"
            size="lg"
            className="border-primary/50 text-primary hover:bg-primary/10 gap-2 rounded-full border-2 px-6"
          >
            <RefreshCw
              className={cn("h-5 w-5", isRetaking && "animate-spin")}
            />
            {isRetaking ? tc("retaking") : tc("retakeButton")}
          </Button>
        </div>
      </CardContent>
    );
  }

  // ==================== QUIZ IN PROGRESS ====================
  return (
    <CardContent className="space-y-4 p-4 sm:p-6">
      {/* Progress Bar & Timer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="text-primary flex items-center gap-2 font-medium">
            <span className="text-lg">📝</span>
            {t("MCQuestion.questionOf", {
              index: currentIndex + 1,
              total: totalQuestions,
            })}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-orange-600">
            <Timer className="h-4 w-4" />
            <span className="font-mono font-bold">{formatTime(timer)}</span>
          </div>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      {/* Question Progress Dots */}
      <div className="flex justify-center gap-2">
        {progress.map((status, index) => (
          <div
            key={index}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all",
              index === currentIndex
                ? "bg-primary scale-110 text-white shadow-md"
                : status === AnswerStatus.CORRECT
                  ? "bg-green-400 text-white"
                  : status === AnswerStatus.INCORRECT
                    ? "bg-red-400 text-white"
                    : "bg-gray-200 text-gray-500",
            )}
          >
            {index === currentIndex
              ? index + 1
              : status === AnswerStatus.CORRECT
                ? "✓"
                : status === AnswerStatus.INCORRECT
                  ? "✗"
                  : index + 1}
          </div>
        ))}
      </div>

      {/* Question Text */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
        <h3 className="text-center text-lg leading-relaxed font-semibold text-gray-800 sm:text-xl md:text-2xl">
          {questions[currentIndex].question}
        </h3>
      </div>

      {/* Answer Options - Kid-friendly buttons */}
      <div className="grid gap-3">
        {shuffledOptions.map((option, i) => {
          const isSelected = activeQuestion === option;
          const isCorrectOption = option === questions[currentIndex].answer;
          const showResult = activeQuestion !== null;

          return (
            <button
              key={i}
              onClick={() => handleSelectOption(option)}
              disabled={activeQuestion !== null}
              className={cn(
                "relative flex items-center gap-3 rounded-2xl p-4 text-left transition-all duration-200",
                "border-2 shadow-sm hover:shadow-md active:scale-[0.98]",
                !showResult && [
                  "hover:border-primary hover:bg-primary/5 border-gray-200 bg-white",
                ],
                showResult &&
                  isSelected &&
                  isCorrectOption && ["border-green-400 bg-green-50"],
                showResult &&
                  isSelected &&
                  !isCorrectOption && ["border-red-400 bg-red-50"],
                showResult &&
                  !isSelected &&
                  isCorrectOption && [
                    "border-green-400 bg-green-50 opacity-70",
                  ],
                showResult &&
                  !isSelected &&
                  !isCorrectOption && ["border-gray-200 bg-gray-50 opacity-50"],
              )}
            >
              {/* Option Label */}
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold",
                  !showResult && "bg-gradient-to-br text-white",
                  !showResult && OPTION_COLORS[i % OPTION_COLORS.length],
                  showResult &&
                    isSelected &&
                    isCorrectOption &&
                    "bg-green-400 text-white",
                  showResult &&
                    isSelected &&
                    !isCorrectOption &&
                    "bg-red-400 text-white",
                  showResult && !isSelected && "bg-gray-300 text-gray-600",
                )}
              >
                {showResult
                  ? isSelected
                    ? isCorrectOption
                      ? "✓"
                      : "✗"
                    : isCorrectOption
                      ? "✓"
                      : String.fromCharCode(65 + i)
                  : String.fromCharCode(65 + i)}
              </div>

              {/* Option Text */}
              <span
                className={cn(
                  "flex-1 text-base font-medium sm:text-lg",
                  showResult &&
                    isSelected &&
                    isCorrectOption &&
                    "text-green-700",
                  showResult &&
                    isSelected &&
                    !isCorrectOption &&
                    "text-red-700",
                  !showResult && "text-gray-700",
                )}
              >
                {option}
              </span>

              {/* Result Icon */}
              {showResult && isSelected && (
                <div className="flex-shrink-0 text-2xl">
                  {isCorrectOption ? "🎉" : "😔"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {textualEvidence && (
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-2">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-semibold text-blue-800">Feedback</p>
              <p className="mt-1 text-sm text-blue-700 sm:text-base">
                &quot;{textualEvidence}&quot;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next/Finish Button */}
      {activeQuestion && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={
              currentIndex < questions.length - 1
                ? handleNextQuestion
                : handleFinishQuiz
            }
            disabled={isSubmitting}
            size="lg"
            className={cn(
              "gap-2 rounded-full px-8 text-lg font-bold shadow-lg transition-all hover:scale-105",
              currentIndex < questions.length - 1
                ? "bg-gradient-to-r from-blue-500 to-blue-600"
                : "bg-gradient-to-r from-green-500 to-green-600",
            )}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                {tc("submitting")}
              </>
            ) : currentIndex < questions.length - 1 ? (
              <>{tc("nextButton")} →</>
            ) : (
              <>🏁 {tc("finishButton")}</>
            )}
          </Button>
        </div>
      )}

      {/* Prompt to select */}
      {!activeQuestion && (
        <p className="text-muted-foreground text-center text-sm">
          👆 {t("MCQuestion.selectOption")}
        </p>
      )}
    </CardContent>
  );
}
