"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Gamepad2, Play, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { VocabularyItem } from "@/store/useGameStore";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VOCABULARY_LANGUAGES,
  SENTENCE_LANGUAGES,
} from "@/components/flashcards/deck-view";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Instruction {
  step: number;
  text: React.ReactNode;
  icon?: LucideIcon;
}

export interface ControlHint {
  label: React.ReactNode;
  keys: React.ReactNode;
  color: string;
}

export interface GameStartScreenProps {
  gameTitle: React.ReactNode;
  vocabulary: VocabularyItem[];
  onStart: () => void;
  gameSubtitle?: React.ReactNode;
  instructions?: Instruction[];
  proTip?: React.ReactNode;
  controls?: ControlHint[];
  startButtonText?: React.ReactNode;
  icon?: LucideIcon;
  children?: React.ReactNode;
  gameType?: "sentence" | "vocabulary";
  selectedLanguage?: string;
  onLanguageChange?: (language: string) => void;
  showSelectionLanguage?: boolean;
}

/**
 * Shared RPG-themed start screen for vocabulary games.
 * Renders instructions, vocabulary list, and a CTA to begin play.
 */
export function GameStartScreen({
  gameTitle,
  vocabulary,
  onStart,
  gameSubtitle,
  instructions,
  proTip,
  controls,
  startButtonText = "Start Game",
  icon: TitleIcon = Gamepad2,
  children,
  selectedLanguage = "th",
  onLanguageChange,
  showSelectionLanguage = false,
  gameType = "vocabulary",
}: GameStartScreenProps) {
  const hasInstructions = Boolean(instructions && instructions.length > 0);
  const hasControls = Boolean(controls && controls.length > 0);
  const t = useTranslations("games");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col"
    >
      {/* <div className="p-6 md:p-8 lg:p-10"> */}
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-br from-yellow-400 to-orange-600 p-3 shadow-lg shadow-orange-900/20">
              <TitleIcon className="h-7 w-7 text-black" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white italic md:text-4xl">
              {gameTitle}
            </h1>
          </div>

          {gameSubtitle && (
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-yellow-500/80 uppercase sm:ml-auto">
              {gameSubtitle}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-8 xl:flex-row">
          <div className="flex-1 space-y-6">
            <section className="rounded-3xl border border-white/5 bg-linear-to-b from-white/4 to-transparent p-6">
              <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-white">
                <Sparkles className="h-5 w-5 fill-yellow-400/20 text-yellow-400" />
                How to Play
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-1">
                {hasInstructions ? (
                  <ul className="space-y-3 text-sm text-slate-300">
                    {instructions?.map((instruction, index) => {
                      const InstructionIcon = instruction.icon;
                      const stepLabel = String(
                        instruction.step ?? index + 1,
                      ).padStart(2, "0");
                      return (
                        <li key={index} className="flex gap-3">
                          <span className="font-bold text-amber-400">
                            {stepLabel}.
                          </span>
                          <span className="flex items-start gap-2">
                            {InstructionIcon ? (
                              <InstructionIcon className="mt-0.5 h-4 w-4 text-amber-300" />
                            ) : null}
                            <span>{instruction.text}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">
                    Instructions will appear once the game is ready.
                  </p>
                )}
              </div>
            </section>

            <div className="flex items-center gap-4 rounded-2xl border border-orange-500/10 bg-orange-500/5 p-4">
              <div className="shrink-0 rounded-lg bg-orange-500/20 p-2">
                <Sparkles className="h-4 w-4 text-orange-400" />
              </div>
              <p className="text-xs leading-relaxed text-orange-200/70">
                <span className="mr-1 font-bold text-orange-400 uppercase">
                  Pro Tip:
                </span>
                {proTip}
              </p>
            </div>
            {showSelectionLanguage && (
              <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  {t("selectTranslation")}
                </h4>
                <Select
                  value={selectedLanguage}
                  onValueChange={(value) => {
                    onLanguageChange?.(value);
                  }}
                >
                  <SelectTrigger className="h-12 w-50">
                    <SelectValue>
                      {selectedLanguage && (
                        <div className="flex items-center gap-3">
                          {gameType === "vocabulary" ? (
                            <>
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
                            </>
                          ) : (
                            <>
                              <span className="text-lg">
                                {
                                  SENTENCE_LANGUAGES[
                                    selectedLanguage as keyof typeof SENTENCE_LANGUAGES
                                  ]?.flag
                                }
                              </span>
                              <div className="flex flex-col text-left">
                                <span className="font-medium">
                                  {
                                    SENTENCE_LANGUAGES[
                                      selectedLanguage as keyof typeof SENTENCE_LANGUAGES
                                    ]?.name
                                  }
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {
                                    SENTENCE_LANGUAGES[
                                      selectedLanguage as keyof typeof SENTENCE_LANGUAGES
                                    ]?.nativeName
                                  }
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(
                      gameType === "vocabulary"
                        ? VOCABULARY_LANGUAGES
                        : SENTENCE_LANGUAGES,
                    ).map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{language.flag}</span>
                          <div className="flex flex-col">
                            <span className="font-medium">{language.name}</span>
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
            )}
          </div>

          <div className="shrink-0 space-y-4 xl:w-95">
            <h2 className="flex justify-between px-2 text-sm font-bold tracking-widest text-slate-500 uppercase">
              Vocabulary List
              <span className="text-yellow-500/50">
                {vocabulary.length} Vocabulary
              </span>
            </h2>
            <ScrollArea className="overflow-auto rounded-2xl border-white/10 bg-slate-900/50">
              {vocabulary.length === 0 ? (
                <div className="p-8 text-center text-white/40 italic">
                  No sentences loaded...
                </div>
              ) : (
                <div className="max-h-100 divide-y divide-white/5">
                  {vocabulary.map((item, i) => (
                    <div
                      key={`${item.term}-${i}`}
                      className="flex flex-col gap-1 p-3 px-4 transition-colors hover:bg-white/5"
                    >
                      <span className="leading-snug font-medium text-white">
                        {item.term}
                      </span>
                      <span className="text-sm leading-snug text-slate-400">
                        {item.translation}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 bg-[#0c0d16]/80 p-4 backdrop-blur-xl md:p-4 lg:p-8">
        <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
          <div className="flex w-full flex-col items-center gap-5 sm:flex-row md:flex-col lg:w-auto">
            <div className="flex w-full grid-cols-2 gap-1 rounded-2xl border border-white/5 bg-black/40 p-1.5 sm:flex sm:w-auto sm:grid-cols-none">
              {hasControls ? (
                <div className="hidden flex-wrap items-center gap-6 text-[10px] tracking-[0.2em] text-white/50 uppercase sm:flex sm:text-xs">
                  {controls?.map((control, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${control.color}`}
                      />
                      {control.label}: {control.keys}
                    </div>
                  ))}
                </div>
              ) : (
                !children && (
                  <span className="hidden text-[10px] tracking-[0.2em] text-white/40 uppercase sm:block">
                    Prepare your strategy
                  </span>
                )
              )}
            </div>

            <div className="flex w-full justify-center sm:w-auto">
              {children}
            </div>
          </div>
          <button
            onClick={onStart}
            className="group relative flex items-center gap-2 rounded-full bg-amber-500 px-12 py-4 font-bold text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all hover:scale-105 hover:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none active:scale-95"
          >
            <Play className="h-5 w-5 fill-current" />
            <span className="relative z-10">{startButtonText}</span>
            <div className="absolute inset-0 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-20" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
