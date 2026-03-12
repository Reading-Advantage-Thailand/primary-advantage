"use client";

import dynamic from "next/dynamic";
import type { VocabularyItem } from "@/store/useGameStore";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Beaker,
  ArrowLeft,
  Trophy,
  Gamepad2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/header";
import { useCallback, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  usePotionRushSentences,
  usePotionRushRankings,
  useSubmitPotionRushResult,
} from "@/hooks/use-potion-rush";

const PotionRushGame = dynamic(
  () => import("@/components/games/sentence/potion-rush/PotionRushGame"),
  { ssr: false },
);

type Difficulty = "easy" | "normal" | "hard" | "extreme";

export default function PotionRushPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [activeTab, setActiveTab] = useState<"game" | "rankings">("game");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("th");
  const t = useTranslations("games");

  const { sentences, warningStatus, isLoading } = usePotionRushSentences({
    language: selectedLanguage,
  });
  const { rankings } = usePotionRushRankings(activeTab === "rankings");
  const { submitResult } = useSubmitPotionRushResult();

  const handleComplete = useCallback(
    async (results: {
      xp: number;
      accuracy: number;
      difficulty: string;
      score: number;
    }) => {
      try {
        await submitResult({
          xp: results.xp,
          score: results.score,
          accuracy: results.accuracy,
          difficulty: results.difficulty,
          correctAnswers: Math.floor(results.score / 10),
          totalAttempts: Math.floor(results.score / 10) + 2,
          gameTime: 0,
        });
      } catch (e) {
        console.error("Failed to submit game results", e);
      }
    },
    [submitResult],
  );

  // Loading Screen
  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="text-primary mb-4 h-10 w-10 animate-spin" />
          <p className="text-muted-foreground text-lg font-medium">
            {t("potionRush.loading")}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Warning Screen
  if (warningStatus.type) {
    return (
      <main className="min-h-screen px-6 py-10 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/games">
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t("backToGames")}
            </Link>
          </Button>

          <Header
            heading="Potion Rush"
            text="Mix ingredients to fulfill orders and become the master alchemist!"
          >
            <Beaker className="text-primary h-8 w-8" />
          </Header>

          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="w-full max-w-2xl">
              <div className="rounded-3xl border-2 border-amber-500/30 bg-linear-to-br from-amber-500/10 to-red-500/10 p-8 shadow-2xl backdrop-blur-sm md:p-12">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-full border-2 border-amber-500/50 bg-amber-500/20 p-6">
                    <AlertTriangle className="h-16 w-16 text-amber-400" />
                  </div>
                </div>

                <h1 className="mb-4 bg-linear-to-r from-amber-300 to-red-300 bg-clip-text text-center text-3xl font-bold text-transparent md:text-4xl">
                  {warningStatus.type === "NO_SENTENCES"
                    ? t("potionRush.noSentences")
                    : t("potionRush.insufficientSentences")}
                </h1>

                <div className="mb-8 space-y-3 text-center">
                  {warningStatus.type === "NO_SENTENCES" ? (
                    <p className="text-lg text-white/80">
                      {t("potionRush.noSentencesDesc")}
                    </p>
                  ) : (
                    <>
                      <p className="text-lg text-white/80">
                        {t("potionRush.insufficientDesc", {
                          count: warningStatus.requiredCount || 0,
                        })}
                      </p>
                      <p className="text-lg text-white/80">
                        {t("potionRush.currentCount", {
                          count: warningStatus.currentCount || 0,
                        })}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                  <Link
                    href="/student/articles"
                    className="group flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/50"
                  >
                    <BookOpen className="h-5 w-5" />
                    {t("potionRush.readArticles")}
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-[calc(100vh-120px)] w-full flex-col bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-slate-900/50 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href="/student/games"
            className="shrink-0 rounded-full p-2 transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-base font-bold text-transparent sm:text-xl">
              {t("potionRush.title")}
            </h1>
            <p className="hidden text-xs text-white/50 sm:block">
              {t("potionRush.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 rounded-lg bg-slate-800 p-1">
          <button
            onClick={() => setActiveTab("game")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-2 text-sm font-medium transition-all sm:gap-2 sm:px-4",
              activeTab === "game"
                ? "bg-purple-600 text-white shadow-md"
                : "text-white/60 hover:text-white",
            )}
          >
            <Gamepad2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("potionRush.play")}</span>
          </button>
          <button
            onClick={() => setActiveTab("rankings")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-2 text-sm font-medium transition-all sm:gap-2 sm:px-4",
              activeTab === "rankings"
                ? "bg-amber-600 text-white shadow-md"
                : "text-white/60 hover:text-white",
            )}
          >
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">{t("potionRush.rankings")}</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === "game" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Difficulty Selector */}
            <div className="flex flex-wrap justify-center gap-1 border-b border-white/5 bg-slate-900/80 px-3 py-2 sm:gap-2 sm:px-6">
              {(["easy", "normal", "hard", "extreme"] as Difficulty[]).map(
                (dif) => (
                  <button
                    key={dif}
                    onClick={() => setDifficulty(dif)}
                    className={cn(
                      "rounded-full border px-2 py-1 text-xs font-bold tracking-wider uppercase transition-all sm:px-3",
                      difficulty === dif
                        ? "scale-105 border-white bg-white text-slate-900"
                        : "border-white/10 bg-transparent text-white/40 hover:border-white/30",
                    )}
                  >
                    {dif}
                  </button>
                ),
              )}
            </div>

            {/* Game Canvas container - grow to fill remaining space */}
            <div className="relative h-full w-full flex-1 bg-neutral-900">
              <div className="absolute inset-0">
                <PotionRushGame
                  vocabList={sentences}
                  difficulty={difficulty}
                  onComplete={handleComplete}
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={setSelectedLanguage}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto h-full w-full max-w-4xl overflow-y-auto p-3 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold sm:mb-6 sm:text-2xl">
              <Trophy className="h-5 w-5 text-amber-400 sm:h-6 sm:w-6" />
              {t("potionRush.leaderboards")}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:gap-8 md:grid-cols-2">
              {(["easy", "normal", "hard", "extreme"] as Difficulty[]).map(
                (dif) => (
                  <div
                    key={dif}
                    className="overflow-hidden rounded-xl border border-white/10 bg-slate-900"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 bg-slate-800 px-4 py-3">
                      <h3 className="font-bold text-white/90 capitalize">
                        {t("potionRush.mode", {
                          difficulty: t(`potionRush.difficulty.${dif}`),
                        })}
                      </h3>
                    </div>
                    <div className="divide-y divide-white/5">
                      {rankings[dif]?.length ? (
                        rankings[dif].map((entry, index) => (
                          <div
                            key={entry.userId}
                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                          >
                            <div
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                                index === 0
                                  ? "bg-amber-400 text-slate-900"
                                  : index === 1
                                    ? "bg-slate-300 text-slate-900"
                                    : index === 2
                                      ? "bg-amber-700 text-white"
                                      : "bg-slate-800 text-white/50",
                              )}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 truncate font-medium text-white/80">
                              {entry.name}
                            </div>
                            <div className="font-mono font-bold text-purple-400">
                              {entry.xp.toLocaleString()} XP
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-sm text-white/30">
                          {t("potionRush.noRecords")}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
