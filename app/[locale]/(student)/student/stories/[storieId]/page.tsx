"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import StarRating from "@/components/ui/rating";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import StorieChapterList from "@/components/stories/storie-chapter-list";
import { BookOpen, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useStory } from "@/hooks/use-story";
import { useParams } from "next/navigation";
import { getStorieImageUrl } from "@/lib/storage-config";
import { Button } from "@/components/ui/button";

export default function StorieChapterSelectionPage() {
  const tCommon = useTranslations("common");
  const params = useParams();
  const storyId = params.storieId as string;
  const locale = useLocale();

  const { story, isLoading, isError, error } = useStory({
    storyId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <Skeleton className="mb-8 h-[400px] w-full rounded-2xl md:h-[500px]" />
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="mt-2 h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !story) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <Card className="border-2 shadow-lg">
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-xl text-gray-500">
              {error?.message || "Story not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Hero Section with Image */}
      <div className="relative mb-8 h-[400px] w-full overflow-hidden rounded-2xl shadow-2xl md:h-[500px]">
        <Image
          src={getStorieImageUrl(story.id, "Cover")}
          alt={story.title}
          className="object-cover"
          fill
          unoptimized
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Content Overlay */}
        <div className="absolute right-0 bottom-0 left-0 p-6 text-white md:p-8">
          <div className="mb-3 flex flex-wrap gap-2">
            {story.raLevel && (
              <Badge className="border-white/30 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                {tCommon("ralevel", { level: story.raLevel })}
              </Badge>
            )}
            {story.cefrLevel && (
              <Badge className="border-white/30 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                {tCommon("cefrlevel", { level: story.cefrLevel })}
              </Badge>
            )}
            {story.rating && (
              <Badge className="border-white/30 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                <StarRating initialRating={story.rating} readOnly />
              </Badge>
            )}
          </div>
          <h1 className="mb-3 text-3xl font-bold drop-shadow-lg md:text-5xl">
            {story.title}
          </h1>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <CardDescription className="text-base">
                {(story.translatedSummary && story.translatedSummary[locale]) ||
                  story.summary}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button>{tCommon("copylink")}</Button>
              {/* <Button>Export Story WorkBook</Button>
              <Button>Delete</Button>
              <Button>Approve</Button> */}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="chapters" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="chapters" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>{tCommon("chapters")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="characters"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                <span>{tCommon("characters")}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chapters" className="mt-0">
              <StorieChapterList
                storieId={story.id}
                chapters={story.chapters.map((ch) => ({
                  id: ch.id,
                  title: ch.title,
                  description:
                    (ch.translatedSummary && ch.translatedSummary[locale]) ||
                    ch.summary,
                }))}
              />
            </TabsContent>

            <TabsContent value="characters" className="mt-0">
              <div className="grid gap-4 md:grid-cols-2">
                {story.characters?.map((char, index) => (
                  <Card
                    key={index}
                    className="transition-shadow hover:shadow-md"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{char.name}</CardTitle>
                      <CardDescription>{char.description}</CardDescription>
                    </CardHeader>
                    {char.background && (
                      <CardContent>
                        <p className="text-muted-foreground text-sm">
                          <span className="font-semibold">Background:</span>{" "}
                          {char.background}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
