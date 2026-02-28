import React, { useState } from "react";
import { VocabularyItem } from "@/store/useGameStore";
import {
  Swords,
  BookOpen,
  Trophy,
  Skull,
  Flame,
  Shield,
  Sparkles,
  LanguagesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { battleEnemies } from "@/lib/games/rpg-battle/rpgBattleSelection";
import { Sprite } from "./Sprite";
import { useTranslations } from "next-intl";
import { useRPGBattleRanking } from "@/hooks/use-rpg-battle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VOCABULARY_LANGUAGES } from "@/components/flashcards/deck-view";

interface StartScreenProps {
  vocabulary: VocabularyItem[];
  onStart: (language: string) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

type TabType = "briefing" | "rankings" | "vocabulary";

interface RankingEntry {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  xp: number;
  difficulty: string;
}

export function StartScreen({
  vocabulary,
  onStart,
  selectedLanguage,
  onLanguageChange,
}: StartScreenProps) {
  const t = useTranslations("games");
  const [activeTab, setActiveTab] = useState<TabType>("briefing");
  const [selectedEnemy, setSelectedEnemy] = useState(battleEnemies[0].id);

  // ─── TanStack Query: rankings (filtered by selected enemy) ───
  const { rankings, isLoading: isLoadingRankings } =
    useRPGBattleRanking(selectedEnemy);

  const tabs = [
    {
      id: "briefing" as TabType,
      label: t("rpgBattle.tabs.briefing"),
      icon: Swords,
    },
    {
      id: "rankings" as TabType,
      label: t("rpgBattle.tabs.rankings"),
      icon: Trophy,
    },
    {
      id: "vocabulary" as TabType,
      label: t("rpgBattle.tabs.vocabulary"),
      icon: BookOpen,
    },
  ];

  return (
    <div className="flex flex-col rounded-lg border bg-slate-900/95 backdrop-blur-md">
      <div className="relative z-20 flex h-full flex-col">
        {/* Header Section */}
        <div className="flex-none px-6 py-4">
          <div className="mb-1 text-[10px] font-bold tracking-[0.3em] text-purple-300/60 uppercase">
            RPG Battle
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {t("rpgBattle.battlePreparation")}
              </h2>
              <p className="mt-0.5 text-sm text-slate-300">
                {t("rpgBattle.reviewSpells")}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] tracking-[0.2em] text-white/70 uppercase backdrop-blur-sm">
              {t("common.ready")}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-none px-6 pb-4">
          <div className="flex gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-2 backdrop-blur-md">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 transition-all duration-300",
                    isActive
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                      : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-300",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        <div className="min-h-0 flex-1 px-6 pb-6">
          {/* Briefing Tab */}
          {activeTab === "briefing" && (
            <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              {/* Left: Theme Card */}
              <div className="group relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-8 text-center backdrop-blur-md">
                <div className="absolute top-1/2 left-1/2 -z-10 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/20 blur-[60px] transition-all duration-700 group-hover:bg-purple-500/30" />
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-purple-500/5 to-transparent opacity-50" />

                <div className="relative z-10 p-4">
                  <div className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 animate-[spin_10s_linear_infinite] rounded-full border border-purple-400/20" />
                  <div className="absolute top-1/2 left-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 animate-[spin_15s_linear_infinite_reverse] rounded-full border border-purple-400/10" />

                  <div className="relative z-20 flex h-28 w-28 items-center justify-center rounded-full border-2 border-purple-400/30 bg-slate-900/80 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                    <div className="absolute inset-2 rounded-full border border-white/10" />
                    <Swords className="h-12 w-12 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
                  </div>
                </div>

                <div className="relative z-10 mt-2 max-w-60">
                  <h3 className="mb-2 text-lg font-bold text-white">
                    {t("rpgBattle.theBattleAwaits")}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {t("rpgBattle.battleDescription")}
                  </p>
                </div>
              </div>

              {/* Right: Instructions */}
              <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-md">
                  <div className="mb-4 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                    <Shield className="h-3 w-3" />
                    {t("common.howToPlay")}
                  </div>

                  <div className="space-y-4 text-sm text-slate-300">
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                        1
                      </div>
                      <div>
                        <p className="mb-1 font-semibold text-white">
                          {t("rpgBattle.instructions.step1Title")}
                        </p>
                        <p className="text-xs text-slate-400">
                          {t("rpgBattle.instructions.step1Desc")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                        2
                      </div>
                      <div>
                        <p className="mb-1 font-semibold text-white">
                          {t("rpgBattle.instructions.step2Title")}
                        </p>
                        <p className="text-xs text-slate-400">
                          {t("rpgBattle.instructions.step2Desc")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                        3
                      </div>
                      <div>
                        <p className="mb-1 font-semibold text-white">
                          {t("rpgBattle.instructions.step3Title")}
                        </p>
                        <p className="text-xs text-slate-400">
                          {t("rpgBattle.instructions.step3Desc")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                      <p className="text-xs text-purple-300">
                        <Sparkles className="mr-1 inline h-3 w-3" />
                        <strong>{t("common.tip")}:</strong>{" "}
                        {t("rpgBattle.instructions.tip")}
                      </p>
                    </div>

                    <div>
                      <h4 className="mb-4 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                        <LanguagesIcon className="h-3 w-3" />
                        {t("selectTranslation")}
                      </h4>
                      <Select
                        value={selectedLanguage}
                        onValueChange={(value) => {
                          onLanguageChange(value);
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
                          {Object.values(VOCABULARY_LANGUAGES).map(
                            (language) => (
                              <SelectItem
                                key={language.code}
                                value={language.code}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">
                                    {language.flag}
                                  </span>
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
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rankings Tab */}
          {activeTab === "rankings" && (
            <div className="flex h-full flex-col gap-4">
              {/* Enemy Selector */}
              <div className="grid flex-none grid-cols-4 gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-md">
                {battleEnemies.map((enemy) => {
                  const isSelected = selectedEnemy === enemy.id;
                  return (
                    <button
                      key={enemy.id}
                      onClick={() => setSelectedEnemy(enemy.id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-300",
                        isSelected
                          ? "scale-105 border-purple-500/50 bg-white/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                          : "border-white/5 bg-transparent opacity-70 hover:border-white/10 hover:bg-white/5 hover:opacity-100",
                      )}
                    >
                      <div className="relative h-12 w-12">
                        <Sprite
                          src={enemy.sprite}
                          pose="idle"
                          alt={enemy.label}
                          size={48}
                          className={cn(
                            "transition-transform duration-300",
                            isSelected && "animate-[bounce_2s_infinite]",
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold tracking-wider uppercase",
                          isSelected ? "text-white" : "text-slate-400",
                        )}
                      >
                        {enemy.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Rankings List */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-md">
                <div className="border-b border-white/5 bg-white/2 px-5 py-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                    <Trophy className="h-3 w-3" />
                    {t("rpgBattle.topWarriors")} -{" "}
                    {battleEnemies.find((e) => e.id === selectedEnemy)?.label}
                  </div>
                </div>

                <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 flex-1 overflow-y-auto p-4">
                  {isLoadingRankings ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      {t("rpgBattle.loadingRankings")}
                    </div>
                  ) : rankings.length > 0 ? (
                    <div className="space-y-2">
                      {rankings.map((entry) => (
                        <div
                          key={entry.userId}
                          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 transition-all hover:bg-white/10"
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold",
                              entry.rank === 1
                                ? "bg-yellow-500/20 text-yellow-400"
                                : entry.rank === 2
                                  ? "bg-slate-400/20 text-slate-300"
                                  : entry.rank === 3
                                    ? "bg-orange-600/20 text-orange-400"
                                    : "bg-slate-700/50 text-slate-400",
                            )}
                          >
                            {entry.rank}
                          </div>
                          {entry.image && (
                            <img
                              src={entry.image}
                              alt={entry.name}
                              className="h-8 w-8 rounded-full"
                            />
                          )}
                          <span className="flex-1 text-sm font-semibold text-slate-200">
                            {entry.name}
                          </span>
                          <span className="text-sm font-bold text-purple-400">
                            {entry.xp} {t("common.xp")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-sm text-slate-500">
                      <Trophy className="mb-3 h-8 w-8 opacity-20" />
                      {t("rpgBattle.noRankings")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Vocabulary Tab */}
          {activeTab === "vocabulary" && (
            <div className="flex h-full max-h-75 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-md">
              <div className="flex-none border-b border-white/5 bg-white/2 px-5 py-4">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                  <BookOpen className="h-3 w-3" />
                  {t("rpgBattle.spellBook")} ({vocabulary.length}{" "}
                  {t("rpgBattle.spells")})
                </div>
              </div>

              <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 min-h-0 flex-1 overflow-y-auto p-2">
                {vocabulary.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-sm text-slate-500">
                    <BookOpen className="mb-3 h-8 w-8 opacity-20" />
                    {t("rpgBattle.noVocabulary")}
                  </div>
                ) : (
                  <div className="grid gap-1">
                    {vocabulary.slice(0, 50).map((item, index) => (
                      <div
                        key={`${item.term}-${index}`}
                        className="group flex items-center justify-between rounded-xl border border-transparent px-4 py-3 transition-all hover:border-white/5 hover:bg-white/5"
                      >
                        <span className="text-sm font-bold text-slate-200 transition-colors group-hover:text-purple-300">
                          {item.term}
                        </span>
                        <span className="text-sm font-medium text-slate-400">
                          {item.translation}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Start Button */}
        <div className="flex-none border-t border-white/5 bg-black/20 p-6 pt-4">
          <div className="flex items-center justify-end gap-6">
            <button
              onClick={() => onStart(selectedLanguage)}
              className="group relative w-full overflow-hidden rounded-full bg-purple-600 py-3 pr-10 pl-8 text-sm font-bold tracking-wider text-white uppercase shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] active:scale-95"
            >
              <div className="absolute inset-0 translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {t("common.startBattle")}
                <Swords className="h-4 w-4" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
