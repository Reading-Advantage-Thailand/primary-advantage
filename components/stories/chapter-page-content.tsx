"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import StorieContent from "@/components/stories/storie-content";
import MCQuestion from "@/components/stories/questions/mc-question";
import LAQuestion from "@/components/stories/questions/la-question";
import SAQuestion from "@/components/stories/questions/sa-question";
import StorieWordlist from "@/components/stories/storie-wordlist";
import StorieSentences from "@/components/stories/storie-sentences";
import { useRouter } from "@/i18n/navigation";
import { useChapter } from "@/hooks/use-chapter";
import { useAutoSaveFlashcard } from "@/hooks/use-auto-save-flashcard";
import { useTranslations } from "next-intl";
import { MoveLeftIcon } from "lucide-react";

interface ChapterPageContentProps {
  storyId: string;
  chapterNumber: number;
}

export default function ChapterPageContent({
  storyId,
  chapterNumber,
}: ChapterPageContentProps) {
  const router = useRouter();
  const tCommon = useTranslations("common");

  const { chapter, isLoading, isError } = useChapter({
    storyId,
    chapterNumber,
  });

  // Auto-save flashcards when quiz is completed
  const { status: flashcardSaveStatus } = useAutoSaveFlashcard({
    storyChapterId: chapter?.id,
    activityStatus: chapter?.activity,
    words: chapter?.flashcards?.words,
    sentences: chapter?.flashcards?.sentences,
    wordsAudioUrl: chapter?.flashcards?.wordsUrl,
    sentencesAudioUrl: chapter?.flashcards?.audioSentenceUrl,
    enabled: !!chapter,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex flex-col gap-4 xl:basis-3/5">
          {/* Back button skeleton */}
          <Skeleton className="h-10 w-48" />

          {/* Main content card */}
          <Card>
            <CardHeader className="space-y-4">
              {/* Title */}
              <Skeleton className="h-10 w-3/4" />
              {/* Badges */}
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
              {/* Summary */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Listen button */}
              <Skeleton className="h-14 w-full rounded-2xl" />

              {/* Image */}
              <Skeleton className="aspect-video w-full rounded-xl" />

              {/* Passage */}
              <div className="space-y-3 rounded-xl bg-amber-50/50 p-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between">
                <Skeleton className="h-12 w-32 rounded-xl" />
                <Skeleton className="h-12 w-32 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 xl:basis-2/5">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-[200px] w-full rounded-lg" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !chapter) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          className="self-start"
          variant="outline"
          onClick={() => router.push(`/student/stories/${storyId}`)}
        >
          <MoveLeftIcon className="mr-2 h-4 w-4" />
          {tCommon("backstoryoverview")}
        </Button>
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground text-lg">
              ไม่พบบทที่ {chapterNumber} หรือเกิดข้อผิดพลาด
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/student/stories/${storyId}`)}
            >
              {tCommon("backstoryoverview")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="flex flex-col gap-4 md:basis-3/5">
        <Button
          className="self-start"
          variant="outline"
          onClick={() => router.push(`/student/stories/${storyId}`)}
        >
          <MoveLeftIcon className="mr-2 h-4 w-4" />
          {tCommon("backstoryoverview")}
        </Button>
        <StorieContent chapter={chapter} />
      </div>
      <div className="flex flex-col gap-4 xl:basis-2/5">
        <div className="flex flex-wrap gap-2">
          <StorieWordlist
            words={chapter.flashcards?.words || []}
            audioUrl={chapter.flashcards?.wordsUrl || ""}
            saveStatus={flashcardSaveStatus}
          />
          <StorieSentences
            sentences={chapter.flashcards?.sentences || []}
            audioUrl={chapter.flashcards?.audioSentenceUrl || ""}
            saveStatus={flashcardSaveStatus}
          />
        </div>
        <MCQuestion
          questions={chapter.multipleChoiceQuestions}
          chapterId={chapter.id}
          storyId={storyId}
          chapterNumber={chapterNumber}
          activity={chapter.activity}
        />
        <SAQuestion
          questions={chapter.shortAnswerQuestions}
          chapterId={chapter.id}
          storyId={storyId}
          chapterNumber={chapterNumber}
          activity={chapter.activity}
        />
        <LAQuestion
          questions={chapter.longAnswerQuestions}
          chapterId={chapter.id}
          storyId={storyId}
          chapterNumber={chapterNumber}
          activity={chapter.activity}
        />
      </div>
    </div>
  );
}
