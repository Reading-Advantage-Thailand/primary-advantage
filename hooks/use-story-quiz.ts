"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface SubmitQuizParams {
  chapterId: string;
  responses: any[];
  score: number;
  timer: number;
}

interface QuizResult {
  score: number;
  xpEarned: number;
  timer: number;
}

interface UseStoryQuizOptions {
  storyId: string;
  chapterNumber: number;
  chapterId: string;
  onSubmitSuccess?: (result: QuizResult) => void;
  onRetakeSuccess?: () => void;
}

export function useStoryQuiz(options: UseStoryQuizOptions) {
  const {
    storyId,
    chapterNumber,
    chapterId,
    onSubmitSuccess,
    onRetakeSuccess,
  } = options;

  const queryClient = useQueryClient();
  const t = useTranslations("Question");

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: async (params: SubmitQuizParams) => {
      const res = await fetch("/api/stories/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: params.chapterId,
          responses: params.responses,
          score: params.score,
          timer: params.timer,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit quiz");
      }

      return res.json();
    },
    onSuccess: (data) => {
      const result: QuizResult = {
        score: data.score,
        xpEarned: data.xpEarned,
        timer: data.timer,
      };

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["chapter", storyId, chapterNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["story", storyId],
      });

      toast.success(t("MCQuestion.quizCompleted"), {
        description: t("MCQuestion.quizCompletedDescription"),
      });

      onSubmitSuccess?.(result);
    },
    onError: (error: Error) => {
      toast.error(t("MCQuestion.quizFailed"), {
        description: error.message,
      });
    },
  });

  // Retake quiz mutation
  const retakeQuizMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stories/quiz", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to retake quiz");
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["chapter", storyId, chapterNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["story", storyId],
      });

      toast.success(t("MCQuestion.retakeSuccess"));

      onRetakeSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(t("MCQuestion.retakeFailed"), {
        description: error.message,
      });
    },
  });

  const submitQuiz = (params: Omit<SubmitQuizParams, "chapterId">) => {
    submitQuizMutation.mutate({
      ...params,
      chapterId,
    });
  };

  const retakeQuiz = () => {
    retakeQuizMutation.mutate();
  };

  return {
    submitQuiz,
    retakeQuiz,
    isSubmitting: submitQuizMutation.isPending,
    isRetaking: retakeQuizMutation.isPending,
    submitError: submitQuizMutation.error,
    retakeError: retakeQuizMutation.error,
  };
}
