"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { SAQFeedbackResponse, LAQFeedbackResponse } from "@/types";

// ==================== Types ====================

interface SubmitSAQParams {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  timer: number;
}

interface SubmitLAQParams {
  question: string;
  answer: string;
  score: number;
  feedback: any;
  timer: number;
}

interface GetFeedbackParams {
  question: string;
  answer: string;
  suggestedResponse?: string;
  preferredLanguage?: string;
}

interface QuizResult {
  success: boolean;
  score: number;
  xpEarned: number;
  timer: number;
  activityId: string;
}

interface UseStorySAQOptions {
  storyId: string;
  chapterNumber: number;
  chapterId: string;
  onSubmitSuccess?: (result: QuizResult) => void;
}

interface UseStoryLAQOptions {
  storyId: string;
  chapterNumber: number;
  chapterId: string;
  onSubmitSuccess?: (result: QuizResult) => void;
}

// ==================== SAQ Hook ====================

export function useStorySAQ(options: UseStorySAQOptions) {
  const { storyId, chapterNumber, chapterId, onSubmitSuccess } = options;

  const queryClient = useQueryClient();
  const { update } = useSession();
  const t = useTranslations("Question");

  // Get SAQ feedback mutation
  const getFeedbackMutation = useMutation({
    mutationFn: async (params: GetFeedbackParams) => {
      const res = await fetch("/api/stories/quiz/saq/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          question: params.question,
          answer: params.answer,
          suggestedResponse: params.suggestedResponse,
          preferredLanguage: params.preferredLanguage || "English",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to get feedback");
      }

      return res.json() as Promise<SAQFeedbackResponse>;
    },
    onError: (error: Error) => {
      toast.error(t("SAQuestion.feedbackFailed"), {
        description: error.message,
      });
    },
  });

  // Submit SAQ mutation
  const submitMutation = useMutation({
    mutationFn: async (params: SubmitSAQParams) => {
      const res = await fetch("/api/stories/quiz/saq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          question: params.question,
          answer: params.answer,
          score: params.score,
          feedback: params.feedback,
          timer: params.timer,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit SAQ");
      }

      return res.json() as Promise<QuizResult>;
    },
    onSuccess: (data) => {
      update();

      queryClient.invalidateQueries({
        queryKey: ["chapter", storyId, chapterNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["story", storyId],
      });

      toast.success(t("SAQuestion.quizCompleted"), {
        description: t("SAQuestion.quizCompletedDescription"),
      });

      onSubmitSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(t("SAQuestion.quizFailed"), {
        description: error.message,
      });
    },
  });

  return {
    getFeedback: getFeedbackMutation.mutateAsync,
    submitSAQ: submitMutation.mutate,
    isGettingFeedback: getFeedbackMutation.isPending,
    isSubmitting: submitMutation.isPending,
    feedbackData: getFeedbackMutation.data,
    feedbackError: getFeedbackMutation.error,
    submitError: submitMutation.error,
  };
}

// ==================== LAQ Hook ====================

export function useStoryLAQ(options: UseStoryLAQOptions) {
  const { storyId, chapterNumber, chapterId, onSubmitSuccess } = options;

  const queryClient = useQueryClient();
  const { update } = useSession();
  const t = useTranslations("Question");

  // Get LAQ feedback mutation
  const getFeedbackMutation = useMutation({
    mutationFn: async (params: GetFeedbackParams) => {
      const res = await fetch("/api/stories/quiz/laq/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          question: params.question,
          answer: params.answer,
          preferredLanguage: params.preferredLanguage || "English",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to get feedback");
      }

      return res.json() as Promise<LAQFeedbackResponse>;
    },
    onError: (error: Error) => {
      toast.error(t("LAQuestion.feedbackFailed"), {
        description: error.message,
      });
    },
  });

  // Submit LAQ mutation
  const submitMutation = useMutation({
    mutationFn: async (params: SubmitLAQParams) => {
      const res = await fetch("/api/stories/quiz/laq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          question: params.question,
          answer: params.answer,
          score: params.score,
          feedback: params.feedback,
          timer: params.timer,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit LAQ");
      }

      return res.json() as Promise<QuizResult>;
    },
    onSuccess: (data) => {
      update();

      queryClient.invalidateQueries({
        queryKey: ["chapter", storyId, chapterNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["story", storyId],
      });

      toast.success(t("LAQuestion.quizCompleted"), {
        description: t("LAQuestion.quizCompletedDescription"),
      });

      onSubmitSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(t("LAQuestion.quizFailed"), {
        description: error.message,
      });
    },
  });

  return {
    getFeedback: getFeedbackMutation.mutateAsync,
    submitLAQ: submitMutation.mutate,
    isGettingFeedback: getFeedbackMutation.isPending,
    isSubmitting: submitMutation.isPending,
    feedbackData: getFeedbackMutation.data,
    feedbackError: getFeedbackMutation.error,
    submitError: submitMutation.error,
  };
}
