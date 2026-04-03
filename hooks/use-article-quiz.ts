import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  startArticleQuizApi,
  type StartArticleQuizInput,
  type StartArticleQuizResponse,
} from "@/utils/api-request";

// ─── useStartArticleQuiz ─────────────────────────────────────
export function useStartArticleQuiz() {
  const mutation = useMutation<
    StartArticleQuizResponse,
    Error,
    StartArticleQuizInput
  >({
    mutationFn: startArticleQuizApi,
  });

  const startQuiz = useCallback(
    (data: StartArticleQuizInput) => mutation.mutate(data),
    [mutation],
  );

  return {
    startQuiz,
    isLogging: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
