"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useCallback, useState } from "react";
import type { EnchantedLibraryGameResult } from "@/components/games/vocabulary/enchanted-library/EnchantedLibraryGame";
import type { Difficulty } from "@/lib/games/enchanted-library/enchantedLibrary";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  BookOpen,
  Trophy,
  Gamepad2,
  PlayIcon,
  ZapIcon,
  GhostIcon,
  BookIcon,
  ShieldIcon,
  LayoutGridIcon,
} from "lucide-react";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  useEnchantedLibraryVocabulary,
  useEnchantedLibraryRanking,
  useSubmitEnchantedLibraryResult,
} from "@/hooks/use-enchanted-library";
import { useTranslations } from "next-intl";

const EnchantedLibraryGame = dynamic(
  () =>
    import("@/components/games/vocabulary/enchanted-library/EnchantedLibraryGame").then(
      (mod) => mod.EnchantedLibraryGame,
    ),
  { ssr: false },
);

export default function EnchantedLibraryPage() {
  const [activeTab, setActiveTab] = useState<"game" | "rankings">("game");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const t = useTranslations("games");

  const { vocabulary, warning, message, isLoading, isError, error } =
    useEnchantedLibraryVocabulary({ language: selectedLanguage });

  const { rankings: rawRankings } = useEnchantedLibraryRanking();
  const { submitResult } = useSubmitEnchantedLibraryResult();

  const rankings = {
    easy: rawRankings.easy ?? [],
    normal: rawRankings.normal ?? [],
    hard: rawRankings.hard ?? [],
    extreme: rawRankings.extreme ?? [],
  };

  const handleComplete = useCallback(
    async (results: EnchantedLibraryGameResult & { gameTime: number }) => {
      try {
        await submitResult({
          xp: results.xp,
          accuracy: results.accuracy,
          correctAnswers: Math.floor(results.xp / (results.accuracy || 1)),
          totalAttempts: Math.floor(
            results.xp / (results.accuracy || 1) / (results.accuracy || 1),
          ),
          difficulty: results.difficulty,
          gameTime: results.gameTime,
        });
      } catch (err) {
        console.error("Failed to save game results:", err);
      }
    },
    [submitResult],
  );

  const hasVocabularyWarning =
    warning === "NO_VOCABULARY" || warning === "INSUFFICIENT_VOCABULARY";

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="text-primary mb-4 h-10 w-10 animate-spin" />
          <p className="text-muted-foreground text-lg font-medium">
            {t("loadingVocabulary")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError || hasVocabularyWarning) {
    return (
      <main className="min-h-screen px-6 py-10 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <Link
            href="/student/games"
            className="text-sm tracking-[0.2em] text-white/60 uppercase transition hover:text-white"
          >
            {t("backToGames")}
          </Link>

          <div className="rounded-lg border border-red-500 bg-red-900/30 p-6 text-center">
            <h2 className="mb-2 text-2xl font-bold">{t("unableToLoadGame")}</h2>
            <p className="text-red-200">
              {message || error?.message || t("failedToLoadVocabulary")}
            </p>
            <p className="mt-4 text-sm text-red-300">
              {t("pleaseSaveVocabulary")}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen p-2 text-white sm:px-4 sm:py-4 md:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-4 flex items-center justify-between px-2">
          <Link
            href="/student/games"
            className="flex items-center text-slate-400 transition-colors hover:text-white"
          >
            <button className="flex items-center text-slate-400 transition-colors hover:text-white">
              <ChevronLeft className="mr-1 h-5 w-5" />
              <span className="hidden font-medium sm:inline">
                Back to Games
              </span>
            </button>
          </Link>

          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("game")}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
                activeTab === "game"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white",
              )}
            >
              <PlayIcon className="h-4 w-4 fill-current" />
              Play
            </button>
            <button
              onClick={() => setActiveTab("rankings")}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
                activeTab === "rankings"
                  ? "bg-amber-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white",
              )}
            >
              <LayoutGridIcon className="h-5 w-5" />
              Ranking
            </button>
          </div>
        </header>

        {/* Main Card */}
        <main className="h-[80vh] max-h-190 min-h-80 overflow-hidden rounded-4xl border border-white/5 bg-[#11131f] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)]">
          {activeTab === "game" ? (
            <EnchantedLibraryGame
              vocabulary={vocabulary}
              onComplete={handleComplete}
              rankings={rankings}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
          ) : (
            <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Trophy className="h-6 w-6 text-amber-500" />
                Leaderboards
              </h2>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {(["easy", "normal", "hard", "extreme"] as Difficulty[]).map(
                  (dif) => (
                    <div
                      key={dif}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-white/5 dark:bg-slate-800">
                        <h3 className="font-bold text-slate-700 capitalize dark:text-white/90">
                          {dif} Mode
                        </h3>
                      </div>
                      <div className="divide-y divide-slate-200 dark:divide-white/5">
                        {rankings[dif]?.length ? (
                          rankings[dif].map((entry, index) => (
                            <div
                              key={entry.userId}
                              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
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
                                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-white/50",
                                )}
                              >
                                {index + 1}
                              </div>
                              <div className="flex-1 truncate font-medium text-slate-700 dark:text-white/80">
                                {entry.name}
                              </div>
                              <div className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                {entry.xp.toLocaleString()} XP
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-sm text-slate-500 dark:text-white/30">
                            No records yet
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
