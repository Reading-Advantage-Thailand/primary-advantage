"use client";

import React, { useRef, useEffect, useMemo, useState } from "react";
import { SentenceTimepoint } from "@/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Translation data structure from chapter.translatedSentences
interface TranslationsData {
  th?: string[];
  cn?: string[];
  tw?: string[];
  vi?: string[];
  en?: string[];
}

interface HighlightedPassageProps {
  sentences: SentenceTimepoint[];
  translations?: TranslationsData | null;
  currentSentenceIndex: number;
  currentWordIndex: number;
  isPlaying: boolean;
  showTranslation: boolean;
  translationLanguage: "th" | "cn" | "tw" | "vi" | "en";
  onWordClick?: (sentenceIndex: number, wordIndex: number) => void;
  onSentenceClick?: (sentenceIndex: number) => void;
  className?: string;
}

// Helper to split sentence text while preserving word boundaries
function splitSentenceIntoWords(
  sentence: string,
): { text: string; isWord: boolean }[] {
  // Split on spaces and punctuation, keeping separators
  const parts = sentence.split(
    /(\s+|[.!?;:,"""''`()[\]{}—–\u2013\u2014\u2026]+)/,
  );
  const result: { text: string; isWord: boolean }[] = [];

  for (let i = 0; i < parts.length; i++) {
    const current = parts[i];
    if (!current) continue;

    const next = parts[i + 1];
    const after = parts[i + 2];

    // Check for contractions (e.g., "don't", "I'm", "she's")
    if (
      /^\w+$/.test(current) &&
      (next === "'" || next === "'") &&
      after &&
      /^[a-z]+$/i.test(after) &&
      ["t", "s", "re", "ll", "ve", "d", "m"].includes(after.toLowerCase())
    ) {
      result.push({ text: current + next + after, isWord: true });
      i += 2;
      continue;
    }

    // Check if this part is an actual word
    const isWord = /[\w]/.test(current) && /^[\w'-]+$/.test(current);
    result.push({ text: current, isWord });
  }

  return result;
}

export default function HighlightedPassage({
  sentences,
  translations,
  currentSentenceIndex,
  currentWordIndex,
  isPlaying,
  showTranslation,
  translationLanguage,
  onWordClick,
  onSentenceClick,
  className,
}: HighlightedPassageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const activeSentenceRef = useRef<HTMLSpanElement>(null);

  // Track tapped sentence for mobile tooltip
  const [tappedSentenceIndex, setTappedSentenceIndex] = useState<number | null>(
    null,
  );

  // Clear tapped sentence when clicking elsewhere or after timeout
  useEffect(() => {
    if (tappedSentenceIndex !== null) {
      const timer = setTimeout(() => {
        setTappedSentenceIndex(null);
      }, 4000); // Hide after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [tappedSentenceIndex]);

  // Clear tapped sentence when active sentence changes (audio is playing)
  useEffect(() => {
    if (isPlaying) {
      setTappedSentenceIndex(null);
    }
  }, [currentSentenceIndex, isPlaying]);

  // Auto-scroll to keep active word visible
  useEffect(() => {
    if (isPlaying && activeWordRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeWord = activeWordRef.current;

      const containerRect = container.getBoundingClientRect();
      const wordRect = activeWord.getBoundingClientRect();

      // Check if word is outside visible area
      const isAbove = wordRect.top < containerRect.top;
      const isBelow = wordRect.bottom > containerRect.bottom;

      if (isAbove || isBelow) {
        activeWord.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentSentenceIndex, currentWordIndex, isPlaying]);

  // Parse sentences with memoization and group into paragraphs
  const { firstParsedSentence, paragraphs } = useMemo(() => {
    const parsed = sentences.map((sentence, index) => ({
      ...sentence,
      parts: splitSentenceIntoWords(sentence.sentence),
      originalIndex: index,
    }));

    // Group sentences into paragraphs (every 3-4 sentences or by period patterns)
    const groups: (typeof parsed)[] = [];
    let currentGroup: typeof parsed = [];

    parsed.forEach((sentence, index) => {
      currentGroup.push(sentence);

      // Start new paragraph every 3-4 sentences or at natural breaks
      const sentenceText = sentence.sentence.trim();
      const isEndOfParagraph =
        currentGroup.length >= 4 ||
        sentenceText.endsWith('."') ||
        sentenceText.endsWith(".'") ||
        (index < parsed.length - 1 &&
          parsed[index + 1].sentence.trim().match(/^["'"']/));

      if (isEndOfParagraph && index < parsed.length - 1) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    });

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return { firstParsedSentence: parsed[0], paragraphs: groups };
  }, [sentences]);

  if (!sentences || sentences.length === 0) {
    return (
      <div className="border-muted-foreground/30 text-muted-foreground rounded-lg border border-dashed p-8 text-center">
        <p className="text-lg">ยังไม่มีข้อมูลบทความ</p>
        <p className="text-sm">กำลังเตรียมเนื้อหา...</p>
      </div>
    );
  }

  // Check if first character should be a drop cap
  const firstWord = firstParsedSentence?.parts.find((p) => p.isWord);
  const hasDropCap = firstWord && firstWord.text.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Book-like decorative header */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent dark:via-amber-600" />
        <span className="text-2xl">📖</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent dark:via-amber-600" />
      </div>

      {/* Story content with paragraphs */}
      <div className="font-article space-y-6">
        {paragraphs.map((paragraph, paragraphIndex) => (
          <p
            key={paragraphIndex}
            className="text-muted-foreground text-lg leading-[2] md:text-xl md:leading-[2]"
          >
            {paragraph.map((sentence, sentenceInParagraphIndex) => {
              const sentenceIndex = sentence.originalIndex;
              const isSentenceActive = sentenceIndex === currentSentenceIndex;
              const isFirstSentenceOfStory =
                paragraphIndex === 0 && sentenceInParagraphIndex === 0;
              let wordCounter = 0;
              const translationText =
                translations?.[translationLanguage]?.[sentenceIndex] ||
                translations?.th?.[sentenceIndex] ||
                "";

              // Show tooltip automatically when:
              // 1. Sentence is active and playing (auto-show during audio)
              // 2. Sentence was tapped (for mobile interaction)
              const shouldShowTooltip =
                showTranslation &&
                translationText &&
                ((isSentenceActive && isPlaying) ||
                  sentenceIndex === tappedSentenceIndex);

              // Handle sentence tap for mobile
              const handleSentenceTap = () => {
                if (showTranslation && translationText) {
                  setTappedSentenceIndex(
                    tappedSentenceIndex === sentenceIndex
                      ? null
                      : sentenceIndex,
                  );
                }
                onSentenceClick?.(sentenceIndex);
              };

              // Sentence content component
              const sentenceContent = (
                <span
                  className={cn(
                    "inline rounded-sm transition-colors duration-200",
                    // Highlight active sentence when playing
                    isSentenceActive &&
                      isPlaying &&
                      "bg-blue-100 dark:bg-blue-900/30",
                    // Highlight sentences with translation when translation mode is on
                    showTranslation &&
                      translationText &&
                      !isSentenceActive &&
                      "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50",
                    // Active sentence with translation - stronger highlight
                    showTranslation &&
                      translationText &&
                      isSentenceActive &&
                      "bg-emerald-200 dark:bg-emerald-800/50",
                    // Tapped sentence highlight
                    showTranslation &&
                      translationText &&
                      sentenceIndex === tappedSentenceIndex &&
                      !isSentenceActive &&
                      "bg-emerald-300 dark:bg-emerald-700/50",
                  )}
                  onClick={handleSentenceTap}
                >
                  {sentence.parts.map((part, partIndex) => {
                    const currentWordIdx = part.isWord ? wordCounter : -1;
                    if (part.isWord) wordCounter++;

                    const isWordActive =
                      isSentenceActive &&
                      currentWordIdx === currentWordIndex &&
                      part.isWord;

                    // Drop cap for very first word
                    const isDropCapWord =
                      isFirstSentenceOfStory &&
                      partIndex === 0 &&
                      part.isWord &&
                      hasDropCap;

                    if (isDropCapWord) {
                      const firstChar = part.text[0];
                      const restOfWord = part.text.slice(1);

                      return (
                        <span
                          key={partIndex}
                          ref={isWordActive ? activeWordRef : null}
                          className={cn(
                            "cursor-pointer",
                            isWordActive &&
                              isPlaying &&
                              "rounded bg-yellow-200 text-gray-800 first-letter:text-gray-900 dark:bg-yellow-300/80",
                            isWordActive &&
                              !isPlaying &&
                              "bg-primary/20 dark:bg-primary/30 rounded",
                          )}
                          onClick={(e) => {
                            if (onWordClick) {
                              e.stopPropagation();
                              onWordClick(sentenceIndex, currentWordIdx);
                            }
                          }}
                        >
                          <span className="float-left mt-1 mr-2 font-serif text-5xl leading-none font-bold text-amber-600 drop-shadow-sm sm:text-6xl md:text-7xl dark:text-amber-400">
                            {firstChar}
                          </span>
                          {restOfWord}
                        </span>
                      );
                    }

                    return (
                      <span
                        key={partIndex}
                        ref={isWordActive ? activeWordRef : null}
                        className={cn(
                          // Base styles - no transitions that affect layout
                          part.isWord && "cursor-pointer rounded-sm",
                          // Hover effect for words
                          part.isWord &&
                            !isWordActive &&
                            "hover:bg-primary/10 dark:hover:bg-primary/20",
                          // Active word highlight - use solid color without text color override
                          isWordActive &&
                            isPlaying &&
                            "bg-yellow-200 text-gray-800 dark:bg-yellow-300/80 dark:first-letter:text-gray-900",
                          // Active word when paused
                          isWordActive &&
                            !isPlaying &&
                            "bg-primary/20 ring-primary/30 dark:bg-primary/30 ring-1",
                        )}
                        onClick={(e) => {
                          if (part.isWord && onWordClick) {
                            e.stopPropagation();
                            onWordClick(sentenceIndex, currentWordIdx);
                          }
                        }}
                      >
                        {part.text}
                      </span>
                    );
                  })}
                </span>
              );

              return (
                <span
                  key={sentenceIndex}
                  ref={isSentenceActive ? activeSentenceRef : null}
                  className="inline"
                >
                  {/* Wrap sentence in tooltip when translation is enabled */}
                  {showTranslation && translationText ? (
                    <Tooltip open={shouldShowTooltip ? true : undefined}>
                      <TooltipTrigger asChild>{sentenceContent}</TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="max-w-xs rounded-lg border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 text-sm text-emerald-800 shadow-xl sm:max-w-sm dark:border-emerald-600 dark:from-emerald-950 dark:to-teal-950 dark:text-emerald-200"
                        sideOffset={8}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">🌐</span>
                          <span className="leading-relaxed">
                            {translationText}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    sentenceContent
                  )}

                  {/* Add space between sentences */}
                  {sentenceInParagraphIndex < paragraph.length - 1 && " "}
                </span>
              );
            })}
          </p>
        ))}
      </div>

      {/* Book-like decorative footer */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent dark:via-amber-600" />
        <span className="text-xl text-amber-500">✦</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent dark:via-amber-600" />
      </div>
    </div>
  );
}
