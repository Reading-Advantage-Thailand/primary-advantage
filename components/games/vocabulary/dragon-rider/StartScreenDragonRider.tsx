"use client";

import { ChevronLeft, LayoutGridIcon, PlayIcon, Trophy } from "lucide-react";
import Link from "next/link";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import React from "react";
import { Difficulty, DragonRiderGame } from "./DragonRiderGame";
import {
  useDragonRiderRanking,
  useDragonRiderVocabulary,
  useSubmitDragonRiderResult,
} from "@/hooks/use-dragon-rider";
import type { DragonRiderResults } from "@/lib/games/dragon-rider/dragonRider";

export default function StartScreenDragonRider() {
  const [activeTab, setActiveTab] = useState<"game" | "rankings">("game");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("th");
  const t = useTranslations("games");

  const { vocabulary, isLoading: isVocabularyLoading } =
    useDragonRiderVocabulary({
      language: selectedLanguage,
    });

  const { rankings: rawRankings } = useDragonRiderRanking();
  const { submitResult } = useSubmitDragonRiderResult();

  const handleComplete = useCallback(
    async (results: DragonRiderResults & { difficulty: string }) => {
      try {
        await submitResult({
          xp: results.xp,
          accuracy: results.accuracy,
          totalAttempts: results.totalAttempts,
          correctAnswers: results.correctAnswers,
          dragonCount: results.dragonCount,
          difficulty: results.difficulty,
          outcome: results.victory ? "victory" : "defeat",
        });
      } catch (err) {
        console.error("Failed to submit Dragon Rider result:", err);
      }
    },
    [submitResult],
  );

  const rankings = {
    easy: rawRankings.easy ?? [],
    normal: rawRankings.normal ?? [],
    hard: rawRankings.hard ?? [],
    extreme: rawRankings.extreme ?? [],
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-4 flex items-center justify-between px-2">
        <Link
          href="/student/games"
          className="flex items-center text-slate-400 transition-colors hover:text-white"
        >
          <button className="flex items-center text-slate-400 transition-colors hover:text-white">
            <ChevronLeft className="mr-1 h-5 w-5" />
            <span className="hidden font-medium sm:inline">
              {t("backToGames")}
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
            // disabled={gamePhase === "playing"}
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
            // disabled={gamePhase === "playing"}
          >
            <LayoutGridIcon className="h-5 w-5" />
            Ranking
          </button>
        </div>
      </header>

      {activeTab === "game" ? (
        <DragonRiderGame
          vocabulary={vocabulary}
          onComplete={handleComplete}
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
    </div>
  );
}
