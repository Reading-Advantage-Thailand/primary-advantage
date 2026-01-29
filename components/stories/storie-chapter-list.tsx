"use client";
import React from "react";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "@/i18n/navigation";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { ArrowRight, BookOpen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export default function StorieChapterList({
  storieId,
  chapters,
}: {
  storieId: string;
  chapters: any[];
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");

  const handleChapterClick = (chapterNum: number) => {
    router.push(`/student/stories/${storieId}/${chapterNum}`);
  };

  const isLoading = !chapters || chapters.length === 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {chapters.map((chapter, index: number) => {
        // const isStarted = chapter.is_read && !chapter.is_completed;
        // const isCompleted = chapter.is_read && chapter.is_completed;
        // const isUnread = !chapter.is_read;

        return (
          <Card
            key={index}
            className={`group border-2 transition-all duration-300 hover:shadow-lg`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-1 items-center gap-2">
                  <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
                    {index + 1}
                  </div>
                  <CardTitle className="flex-1 text-lg leading-tight">
                    {chapter.title}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              ) : (
                <CardDescription className="line-clamp-3 text-sm">
                  {chapter.description}
                </CardDescription>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  className="transition-transform group-hover:translate-x-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChapterClick(index + 1);
                  }}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  {tCommon("readchapters", { number: index + 1 })}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
