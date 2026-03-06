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
import { VOCABULARY_LANGUAGES } from "@/components/flashcards/deck-view";
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
  selectedLanguage?: string;
  onLanguageChange?: (language: string) => void;
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
}: GameStartScreenProps) {
  const hasInstructions = Boolean(instructions && instructions.length > 0);
  const hasControls = Boolean(controls && controls.length > 0);
  const t = useTranslations("games");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
    >
      <div className="flex-1 space-y-8 overflow-y-auto p-6 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <TitleIcon className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {gameTitle}
              </h2>
            </div>
          </div>
          {gameSubtitle ? (
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-xs font-bold tracking-wider text-amber-300 uppercase">
              {gameSubtitle}
            </div>
          ) : null}
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                <Sparkles className="h-5 w-5 text-amber-400" /> How to Play
              </h3>
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

            {proTip ? (
              <div className="flex items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                <Sparkles className="h-6 w-6 shrink-0 text-amber-300" />
                <p>
                  <b>Pro Tip:</b> {proTip}
                </p>
              </div>
            ) : null}

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
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                <BookOpen className="h-5 w-5 text-emerald-400" /> Vocabulary
                List
              </h3>
              <span className="text-xs text-white/40">
                {vocabulary.length} Vocabulary
              </span>
            </div>
            <ScrollArea className="max-h-100 overflow-auto rounded-2xl border-white/10 bg-slate-900/50">
              {vocabulary.length === 0 ? (
                <div className="p-8 text-center text-white/40 italic">
                  No sentences loaded...
                </div>
              ) : (
                <div className="divide-y divide-white/5">
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

      <footer className="flex flex-col gap-6 border-t border-white/10 bg-slate-900/80 p-6 backdrop-blur-md sm:p-8">
        {hasControls ? (
          <div className="hidden flex-wrap items-center gap-6 text-[10px] tracking-[0.2em] text-white/50 uppercase sm:flex sm:text-xs">
            {controls?.map((control, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${control.color}`} />
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

        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">{children}</div>

          <button
            onClick={onStart}
            className="group relative flex items-center gap-2 rounded-full bg-amber-500 px-12 py-4 font-bold text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all hover:scale-105 hover:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none active:scale-95"
          >
            <Play className="h-5 w-5 fill-current" />
            <span className="relative z-10">{startButtonText}</span>
            <div className="absolute inset-0 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-20" />
          </button>
        </div>
      </footer>
    </motion.div>
  );
}
