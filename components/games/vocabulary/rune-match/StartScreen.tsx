"use client";
import { VocabularyItem } from "@/store/useGameStore";
import { BookOpen, Swords, Trophy, Shield, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  RUNE_MATCH_CONFIG,
  type MonsterType,
} from "@/lib/games/rune-match/runeMatchConfig";
import { withBasePath } from "@/lib/games/basePath";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VOCABULARY_LANGUAGES } from "@/components/flashcards/deck-view";
import dynamic from "next/dynamic";
import {
  useRuneMatchVocabulary,
  useRuneMatchRankings,
  useSubmitRuneMatchResult,
} from "@/hooks/use-rune-match";
import { useGameStore } from "@/store/useGameStore";
import type { RuneMatchGameResult } from "@/components/games/vocabulary/rune-match/RuneMatchGame";

const RuneMatchGame = dynamic(
  () =>
    import("@/components/games/vocabulary/rune-match/RuneMatchGame").then(
      (mod) => mod.RuneMatchGame,
    ),
  { ssr: false },
);

// Helper for simplified monster metadata (could be shared or duplicated if simple enough)
const getMonsterMetadata = (
  t: any,
): Record<MonsterType, { label: string; image: string }> => ({
  goblin: {
    label: t("runeMatch.monsters.goblin"),
    image: "/games/rune-match/monsters/goblin_3x4_pose_sheet.png",
  },
  skeleton: {
    label: t("runeMatch.monsters.skeleton"),
    image: "/games/rune-match/monsters/skeleton_3x4_pose_sheet.png",
  },
  orc: {
    label: t("runeMatch.monsters.orc"),
    image: "/games/rune-match/monsters/orc_3x4_pose_sheet.png",
  },
  dragon: {
    label: t("runeMatch.monsters.dragon"),
    image: "/games/rune-match/monsters/dragon_3x4_pose_sheet.png",
  },
});

interface StartScreenProps {
  vocabulary?: VocabularyItem[];
  // onStart: () => void;
  // isLoading?: boolean;
}

type TabType = "briefing" | "rankings" | "vocabulary";

export function StartScreen({
  vocabulary,
  // onStart,
  // isLoading,
}: StartScreenProps) {
  const t = useTranslations("games");
  const MONSTER_METADATA = getMonsterMetadata(t);
  const [activeTab, setActiveTab] = useState<TabType>("briefing");
  const [selectedMonster, setSelectedMonster] = useState<MonsterType>("goblin");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const {
    rankings,
    scope: rankingScope,
    isLoading: isLoadingRankings,
  } = useRuneMatchRankings(
    activeTab === "rankings" ? selectedMonster : undefined,
  );

  const tabs = [
    {
      id: "briefing" as TabType,
      label: t("runeMatch.tabs.briefing"),
      icon: Swords,
    },
    {
      id: "rankings" as TabType,
      label: t("runeMatch.tabs.rankings"),
      icon: Trophy,
    },
    {
      id: "vocabulary" as TabType,
      label: t("runeMatch.tabs.vocabulary"),
      icon: BookOpen,
    },
  ];

  const { vocabulary: fetchedVocabulary, isLoading } = useRuneMatchVocabulary({
    language: selectedLanguage,
  });

  const { submitResult, isSubmitting } = useSubmitRuneMatchResult();
  const setLastResult = useGameStore((state) => state.setLastResult);

  const handleComplete = async (results: RuneMatchGameResult) => {
    setLastResult(results.xp, results.accuracy);

    try {
      await submitResult({
        score: results.score,
        correctAnswers: results.correctAnswers,
        totalAttempts: results.totalAttempts,
        accuracy: results.accuracy,
        difficulty: results.monsterType ?? selectedMonster,
      });
    } catch (error) {
      console.error("Failed to submit game results:", error);
    }

    setIsPlaying(false);
  };

  const handleStart = () => {
    setIsPlaying(true);
  };

  if (isPlaying) {
    return (
      <RuneMatchGame
        vocabulary={fetchedVocabulary}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-white/10 bg-slate-900/70 backdrop-blur-md">
      <div className="relative z-20 flex flex-col">
        {/* Header Section */}
        <div className="flex-none border-b border-white/5 px-6 py-4">
          <div className="mb-1 text-[10px] font-bold tracking-[0.3em] text-cyan-300/60 uppercase">
            Rune Match
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {t("runeMatch.adventureAwaits")}
              </h2>
              <p className="mt-0.5 text-sm text-slate-300">
                {t("runeMatch.prepareRunes")}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] tracking-[0.2em] text-white/70 uppercase backdrop-blur-sm">
              {t("common.ready")}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-none px-4 pt-4 pb-0 sm:px-6">
          <div className="flex gap-1.5 rounded-2xl border border-white/10 bg-slate-900/60 p-1.5 backdrop-blur-md sm:gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all duration-300 sm:gap-2 sm:px-4",
                    isActive
                      ? "border border-cyan-500/30 bg-cyan-600/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                      : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-300",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate text-xs font-bold tracking-wider uppercase sm:text-sm">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        <div className="min-h-0 flex-1 px-6 py-4">
          {/* Briefing Tab */}
          {activeTab === "briefing" && (
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              <div className="flex flex-col gap-4">
                <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-cyan-900/10 p-6">
                  <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-cyan-500/20 blur-2xl" />
                  <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-white">
                    <Shield className="h-5 w-5 text-cyan-400" />
                    {t("runeMatch.missionObjective")}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {t("runeMatch.missionDescription")}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    {t("runeMatch.gameplayTips")}
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex gap-2">
                      <span className="font-bold text-cyan-400">•</span>
                      <span>{t("runeMatch.tip1")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-green-400">•</span>
                      <span>
                        {t("runeMatch.tip2Prefix")}{" "}
                        <span className="text-green-400">
                          {t("runeMatch.tip2Heal")}
                        </span>{" "}
                        {t("runeMatch.tip2Suffix")}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-400">•</span>
                      <span>
                        {t("runeMatch.tip3Prefix")}{" "}
                        <span className="text-blue-400">
                          {t("runeMatch.tip3Shield")}
                        </span>{" "}
                        {t("runeMatch.tip3Suffix")}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-yellow-400">•</span>
                      <span>{t("runeMatch.tip4")}</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    {t("selectTranslation")}
                  </h4>
                  <Select
                    value={selectedLanguage}
                    onValueChange={(value) => {
                      setSelectedLanguage(value);
                      const language =
                        VOCABULARY_LANGUAGES[
                          value as keyof typeof VOCABULARY_LANGUAGES
                        ];
                    }}
                  >
                    <SelectTrigger className="h-12 w-50">
                      <SelectValue>
                        {selectedLanguage && (
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {
                                VOCABULARY_LANGUAGES[
                                  selectedLanguage as keyof typeof VOCABULARY_LANGUAGES
                                ]?.flag
                              }
                            </span>
                            <div className="flex flex-col text-left">
                              <span className="font-medium">
                                {
                                  VOCABULARY_LANGUAGES[
                                    selectedLanguage as keyof typeof VOCABULARY_LANGUAGES
                                  ]?.name
                                }
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {
                                  VOCABULARY_LANGUAGES[
                                    selectedLanguage as keyof typeof VOCABULARY_LANGUAGES
                                  ]?.nativeName
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(VOCABULARY_LANGUAGES).map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{language.flag}</span>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {language.name}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {language.nativeName}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
                <div className="mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                  <Swords className="h-8 w-8 text-cyan-400" />
                </div>
                <h3 className="mb-1 font-bold text-white">
                  {t("runeMatch.combatReady")}
                </h3>
                <p className="max-w-50 text-xs text-slate-400">
                  {t("runeMatch.combatReadyDesc")}
                </p>
              </div>
            </div>
          )}

          {/* Rankings Tab */}
          {activeTab === "rankings" && (
            <div className="flex h-full flex-col gap-4">
              {/* Monster Selector */}
              <div className="grid flex-none grid-cols-4 gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-md">
                {(Object.keys(MONSTER_METADATA) as MonsterType[]).map(
                  (type) => {
                    const meta = MONSTER_METADATA[type];
                    const isSelected = selectedMonster === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedMonster(type)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-xl border p-2 transition-all duration-300",
                          isSelected
                            ? "scale-105 border-cyan-500/50 bg-white/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                            : "border-white/5 bg-transparent opacity-70 hover:border-white/10 hover:bg-white/5 hover:opacity-100",
                        )}
                      >
                        <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/5 bg-slate-950/50">
                          <div
                            style={{
                              backgroundImage: `url(${withBasePath(meta.image)})`,
                              backgroundSize: "300% 400%",
                              backgroundPosition: "50% 0", // Face forward
                              imageRendering: "pixelated",
                              width: "100%",
                              height: "100%",
                            }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-bold tracking-wider uppercase",
                            isSelected ? "text-white" : "text-slate-400",
                          )}
                        >
                          {meta.label}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-2 flex items-center justify-between px-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold tracking-wider text-slate-400 uppercase">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    {t("runeMatch.topHeroes")} (
                    {MONSTER_METADATA[selectedMonster].label})
                  </h3>
                </div>

                <div className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex-1 overflow-y-auto pr-2">
                  {isLoadingRankings ? (
                    <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                      {t("runeMatch.loadingRankings")}
                    </div>
                  ) : rankings.length > 0 ? (
                    <div className="space-y-2">
                      {rankings.map((entry, index) => (
                        <div
                          key={entry.userId}
                          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 flex-none items-center justify-center rounded-lg text-sm font-bold",
                              index === 0
                                ? "border border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                                : index === 1
                                  ? "border border-slate-400/30 bg-slate-400/20 text-slate-300"
                                  : index === 2
                                    ? "border border-orange-600/30 bg-orange-600/20 text-orange-400"
                                    : "border border-slate-700 bg-slate-800 text-slate-400",
                            )}
                          >
                            {index + 1}
                          </div>
                          {entry.image && (
                            <img
                              src={entry.image}
                              alt={entry.name}
                              className="h-8 w-8 rounded-full border border-white/10"
                            />
                          )}
                          <span className="flex-1 truncate text-sm font-medium text-slate-200">
                            {entry.name}
                          </span>
                          <span className="text-sm font-bold text-cyan-400">
                            {entry.xp.toLocaleString()} XP
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center text-sm text-slate-500">
                      <Trophy className="mb-2 h-8 w-8 opacity-20" />
                      {t("runeMatch.noRankings")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Vocabulary Tab */}
          {activeTab === "vocabulary" && (
            <div className="flex h-full flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold tracking-wider text-slate-400 uppercase">
                  <BookOpen className="h-4 w-4 text-emerald-500" />
                  {t("runeMatch.runeCollection")} ({fetchedVocabulary.length})
                </h3>
              </div>

              <div className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex-1 overflow-y-auto pr-2">
                {fetchedVocabulary.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {fetchedVocabulary.slice(0, 50).map((item, index) => (
                      <div
                        key={`${item.term}-${index}`}
                        className="flex flex-col rounded-lg border border-white/5 bg-white/5 px-3 py-2 hover:border-white/10"
                      >
                        <span className="text-sm font-medium text-slate-200">
                          {item.term}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.translation}
                        </span>
                      </div>
                    ))}
                    {fetchedVocabulary.length > 50 && (
                      <div className="col-span-full py-2 text-center text-xs text-slate-500 italic">
                        + {fetchedVocabulary.length - 50} more words...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center text-sm text-slate-500">
                    <BookOpen className="mb-2 h-8 w-8 opacity-20" />
                    {t("runeMatch.noVocabulary")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none border-t border-white/5 bg-black/20 p-6 pt-4">
          <button
            onClick={() => handleStart()}
            disabled={isLoading || fetchedVocabulary.length === 0}
            className="group relative w-full overflow-hidden rounded-xl bg-cyan-600 py-4 text-sm font-bold tracking-widest text-white uppercase shadow-[0_0_20px_rgba(8,145,178,0.4)] transition-all hover:shadow-[0_0_30px_rgba(8,145,178,0.6)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="absolute inset-0 translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? t("common.loading") : t("common.startGame")}
              <Swords className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
