"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BookCheck } from "lucide-react";
import { useTranslations } from "next-intl";

interface FlashcardSavedBadgeProps {
  articleId: string;
  initialSaved: boolean;
}

export default function FlashcardSavedBadge({
  articleId,
  initialSaved,
}: FlashcardSavedBadgeProps) {
  const t = useTranslations("Article");

  const { data } = useQuery<{ wordsExist: boolean; sentencesExist: boolean }>({
    queryKey: ["flashcard-existence", "article", articleId],
    queryFn: async () => {
      const response = await fetch(
        `/api/flashcard/article?articleId=${articleId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to check flashcard existence");
      }
      return response.json();
    },
    initialData: initialSaved
      ? { wordsExist: true, sentencesExist: true }
      : undefined,
    staleTime: 30 * 1000,
  });

  const isSaved = data?.wordsExist || data?.sentencesExist || initialSaved;

  return (
    <Badge>
      <BookCheck className="h-4 w-4" />
      {isSaved ? t("saveToFlashcard") : t("notSaved")}
    </Badge>
  );
}
