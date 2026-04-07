"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Article, SentenceTimepoint } from "@/types";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Languages,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchArticleActivity } from "@/actions/article";
import Image from "next/image";
import { getArticleImageUrl, getAudioUrl } from "@/lib/storage-config";
import { useAudioPlayer } from "@/hooks/use-audio-player";

// --- Word alignment helpers ---

/** Strip apostrophes and non-alphanumeric chars for fuzzy word matching */
function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/['''\u2019`]/g, "").replace(/[^a-z0-9]/g, "");
}

/** Split sentence text into display parts, merging common English contractions */
function splitIntoDisplayParts(text: string): string[] {
  const CONTRACTION_SUFFIXES = new Set(["t", "s", "re", "ll", "ve", "d", "m"]);
  const raw = text.split(
    /(\s+|[.!?;:,"""''`()[\]{}—–\u2013\u2014\u2026]+)/,
  );
  const merged: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i] ?? "";
    const nxt = raw[i + 1] ?? "";
    const aft = raw[i + 2] ?? "";
    if (
      cur &&
      /^\w+$/.test(cur) &&
      /^['''\u2019]$/.test(nxt) &&
      aft &&
      /^[a-z]+$/i.test(aft) &&
      CONTRACTION_SUFFIXES.has(aft.toLowerCase())
    ) {
      merged.push(cur + nxt + aft);
      i += 2;
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

/** A part is an "actual word" when it contains letters/numbers and no bare punctuation */
function isActualWordPart(part: string): boolean {
  return /[\w]/.test(part) && /^[\w'-]+$/.test(part) && part.trim() !== "";
}

/** Compute Levenshtein edit distance between two strings */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

/**
 * Build bidirectional maps between display-word index and audio-word index.
 *
 * TTS engines may tokenize contractions differently from the display text, e.g.:
 *   display "didn't" → audio "didt" (apostrophe stripped, merged)
 *   display "I'm"    → audio ["i","m"] (split)
 *   display "they're"→ audio "theyre"
 *
 * Matching tiers (in order):
 *   1. Exact normalized match
 *   2. Combine up to 3 consecutive audio words (handles "i"+"m" → "i'm")
 *   3. Prefix: audio-word is prefix of display-word (≥60% length coverage)
 *   4. Suffix: audio-word is suffix of display-word (≥60% length coverage)
 *   5. Levenshtein ≤ 1 (both words length ≥ 3)
 *   6. Positional 1-to-1 fallback
 */
function buildWordMaps(sentence: SentenceTimepoint): {
  audioToDisplay: Map<number, number>;
  displayToAudio: Map<number, number>;
} {
  const parts = splitIntoDisplayParts(sentence.sentence);
  const displayWords = parts.filter(isActualWordPart);
  const audioWords = sentence.words;

  const audioToDisplay = new Map<number, number>();
  const displayToAudio = new Map<number, number>();

  let audioIdx = 0;
  for (
    let dIdx = 0;
    dIdx < displayWords.length && audioIdx < audioWords.length;
    dIdx++
  ) {
    const normDisplay = normalizeWord(displayWords[dIdx]);

    // Tier 1 + 2: exact match, optionally combining up to 3 consecutive audio words
    let combined = "";
    let matched = false;
    for (
      let k = audioIdx;
      k < Math.min(audioIdx + 3, audioWords.length);
      k++
    ) {
      combined += normalizeWord(audioWords[k].word);
      if (combined === normDisplay) {
        for (let m = audioIdx; m <= k; m++) audioToDisplay.set(m, dIdx);
        displayToAudio.set(dIdx, audioIdx);
        audioIdx = k + 1;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const normAudio = normalizeWord(audioWords[audioIdx].word);
      const minLen = Math.min(normAudio.length, normDisplay.length);
      const maxLen = Math.max(normAudio.length, normDisplay.length);
      const COVERAGE = 0.6;

      // Tier 3: prefix — audio word is prefix of display word with ≥60% coverage
      if (
        !matched &&
        minLen >= 2 &&
        minLen / maxLen >= COVERAGE &&
        normDisplay.startsWith(normAudio)
      ) {
        audioToDisplay.set(audioIdx, dIdx);
        displayToAudio.set(dIdx, audioIdx);
        audioIdx++;
        matched = true;
      }

      // Tier 4: suffix — audio word is suffix of display word with ≥60% coverage
      if (
        !matched &&
        minLen >= 2 &&
        minLen / maxLen >= COVERAGE &&
        normDisplay.endsWith(normAudio)
      ) {
        audioToDisplay.set(audioIdx, dIdx);
        displayToAudio.set(dIdx, audioIdx);
        audioIdx++;
        matched = true;
      }

      // Tier 5: Levenshtein distance ≤ 1 (for short corruptions like "didt" vs "didnt")
      if (
        !matched &&
        normAudio.length >= 3 &&
        normDisplay.length >= 3 &&
        levenshtein(normAudio, normDisplay) <= 1
      ) {
        audioToDisplay.set(audioIdx, dIdx);
        displayToAudio.set(dIdx, audioIdx);
        audioIdx++;
        matched = true;
      }

      // Tier 6: positional 1-to-1 fallback
      if (!matched) {
        audioToDisplay.set(audioIdx, dIdx);
        displayToAudio.set(dIdx, audioIdx);
        audioIdx++;
      }
    }
  }

  return { audioToDisplay, displayToAudio };
}

// --- End helpers ---

type Props = {
  article: Article;
};

const SUPPORTED_LANGUAGES = {
  th: "🇹🇭 Thai",
  vi: "🇻🇳 Vietnamese",
  cn: "🇨🇳 Chinese (Simplified)",
  tw: "🇹🇼 Chinese (Traditional)",
};

export default function ArticleContent({ article }: Props) {
  const currentSentenceRef = useRef<HTMLSpanElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Per-sentence bidirectional word alignment maps (audio index ↔ display index)
  const wordMapsRef = useRef<Map<number, ReturnType<typeof buildWordMaps>>>(
    new Map(),
  );

  const [togglePlayer, setTogglePlayer] = useState<boolean>(false);
  const [loading] = useState(false);
  const [translate, setTranslate] = useState<string>("");
  const [isTranslateOpen, setIsTranslateOpen] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("th");
  const t = useTranslations("Components");
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState<boolean>(false);

  // Sentences typed for the hook
  const sentences = Array.isArray(article.sentences)
    ? (article.sentences as SentenceTimepoint[])
    : [];

  const {
    audioRef,
    isPlaying,
    currentSentenceIndex,
    currentWordIndex: audioWordIndex,
    play,
    pause,
    seekToWord,
    setPlaybackRate,
    reset,
  } = useAudioPlayer({
    audioUrl: togglePlayer ? getAudioUrl(article.audioUrl || "") : null,
    sentences,
  });

  // Convert hook's audio word index → display word index via alignment map
  const currentWordIndex =
    wordMapsRef.current
      .get(currentSentenceIndex)
      ?.audioToDisplay.get(audioWordIndex) ?? audioWordIndex;

  useEffect(() => {
    if (article.id) {
      fetchArticleActivity(article.id).catch(console.error);
    }
  }, [article.id]);

  // Pre-compute word alignment maps for every sentence
  useEffect(() => {
    if (Array.isArray(article.sentences)) {
      const maps = new Map<number, ReturnType<typeof buildWordMaps>>();
      (article.sentences as SentenceTimepoint[]).forEach((sentence, i) => {
        maps.set(i, buildWordMaps(sentence));
      });
      wordMapsRef.current = maps;
    }
  }, [article.sentences]);

  // Auto-scroll active sentence into view (with 3 s pause-on-user-scroll)
  useEffect(() => {
    if (
      isPlaying &&
      currentSentenceIndex !== -1 &&
      currentSentenceRef.current &&
      !isAutoScrollPaused
    ) {
      const timeoutId = setTimeout(() => {
        currentSentenceRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [currentSentenceIndex, isPlaying, isAutoScrollPaused]);

  // IntersectionObserver for fixed-controls visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsControlsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: "-10px 0px -10px 0px",
      },
    );

    if (controlsRef.current) {
      observer.observe(controlsRef.current);
    }

    return () => {
      if (controlsRef.current) {
        observer.unobserve(controlsRef.current);
      }
    };
  }, []);

  // Pause auto-scroll for 3 s when user scrolls manually
  useEffect(() => {
    let isScrolling = false;

    const handleScroll = () => {
      if (!isScrolling && isPlaying) {
        isScrolling = true;
        setIsAutoScrollPaused(true);

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          setIsAutoScrollPaused(false);
          isScrolling = false;
        }, 3000);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setIsAutoScrollPaused(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    }
  }, [isPlaying]);

  const shouldShowFixedControls =
    togglePlayer && isPlaying && !isControlsVisible;

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      try {
        await play();
      } catch (error) {
        console.log("Error playing audio: ", error);
      }
    }
  }, [isPlaying, play, pause]);

  const handleTogglePlayer = useCallback(() => {
    if (togglePlayer) {
      reset();
      setTogglePlayer(false);
      setIsTranslateOpen(false);
    } else {
      setTogglePlayer(true);
    }
  }, [togglePlayer, reset]);

  const handleSpeedTime = useCallback(
    (value: string) => {
      setPlaybackRate(Number(value));
    },
    [setPlaybackRate],
  );

  const handleTranslate = useCallback(
    (sentenceIndex: number) => {
      if (selectedLanguage) {
        setTranslate(
          article.translatedPassage?.[
            selectedLanguage as "th" | "cn" | "tw" | "vi"
          ]?.[sentenceIndex] || "",
        );
      } else {
        if (sentenceIndex !== -1) {
          setTranslate(article.sentences?.[sentenceIndex]?.sentence || "");
        } else {
          setTranslate("");
        }
      }
    },
    [selectedLanguage, article.translatedPassage, article.sentences],
  );

  const handleTranslateClick = useCallback(
    (sentenceIndex: number) => {
      setIsTranslateOpen(true);
      handleTranslate(sentenceIndex);
    },
    [handleTranslate],
  );

  useEffect(() => {
    handleTranslate(currentSentenceIndex);
  }, [currentSentenceIndex, selectedLanguage, handleTranslate]);

  const handleWordClick = useCallback(
    (sentenceIndex: number, displayWordIdx: number) => {
      if (displayWordIdx === -1 || !togglePlayer) return;
      // Convert display word index → audio word index for seeking
      const audioWIdx =
        wordMapsRef.current
          .get(sentenceIndex)
          ?.displayToAudio.get(displayWordIdx) ?? displayWordIdx;
      seekToWord(sentenceIndex, audioWIdx);
      if (!isPlaying) {
        play().catch((err) => console.log("Error playing audio: ", err));
      }
    },
    [togglePlayer, isPlaying, play, seekToWord],
  );

  const paragraphs = article.passage
    .split("\n\n")
    .filter((p) => p.trim() !== "");

  return (
    <div className="flex flex-col gap-4">
      <div ref={controlsRef} className="flex flex-col gap-2 md:flex-row">
        <div id="onborda-audio" className="w-full">
          {/* Hidden audio element managed by useAudioPlayer */}
          {togglePlayer && (
            <audio ref={audioRef} src={getAudioUrl(article.audioUrl || "")} preload="auto" />
          )}
          <Button
            variant="default"
            className="w-full"
            onClick={handleTogglePlayer}
          >
            {t("audioButton")}
          </Button>
        </div>
        <div id="onborda-translate" className="flex gap-2">
          <Select
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
            disabled={loading}
          >
            <SelectTrigger className="h-10 w-full">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                <SelectValue>
                  <span className="text-lg">
                    {selectedLanguage === "th" && "🇹🇭"}
                    {selectedLanguage === "vi" && "🇻🇳"}
                    {selectedLanguage === "cn" && "🇨🇳"}
                    {selectedLanguage === "tw" && "🇹🇼"}
                  </span>
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-60 w-48">
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <SelectItem key={code} value={code} className="w-full">
                  <span className="truncate">{name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="default"
            disabled={loading || currentSentenceIndex === -1}
            onClick={() => {
              isTranslateOpen
                ? setIsTranslateOpen(false)
                : setIsTranslateOpen(true);
              handleTranslate(currentSentenceIndex);
            }}
            className="flex items-center gap-2"
          >
            <>
              <Languages className="h-4 w-4" />
              {isTranslateOpen ? t("closeButton") : t("translate")}
            </>
          </Button>
        </div>
      </div>

      {shouldShowFixedControls && (
        <div className="bg-primary dark:bg-primary-foreground fixed right-0 bottom-0 left-0 z-50 border-t p-4 shadow-lg transition-all duration-300">
          <div className="mx-auto max-w-4xl space-y-3">
            {isTranslateOpen && (
              <div className="flex flex-col items-center justify-center border-b pb-3">
                <p className="text-center text-green-500">{translate}</p>
              </div>
            )}

            {/* Main Controls */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-center md:gap-4">
              <div className="flex w-full items-center md:grow">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleTogglePlayer}
                >
                  {t("audioButton")}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                  disabled={loading}
                >
                  <SelectTrigger className="h-10 w-17.5 md:w-auto">
                    <div className="flex items-center gap-1 md:gap-2">
                      <Languages className="h-4 w-4 shrink-0" />
                      <SelectValue>
                        <span className="text-lg">
                          {selectedLanguage === "th" && "🇹🇭"}
                          {selectedLanguage === "vi" && "🇻🇳"}
                          {selectedLanguage === "cn" && "🇨🇳"}
                          {selectedLanguage === "tw" && "🇹🇼"}
                        </span>
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-60 w-48">
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                      <SelectItem key={code} value={code} className="w-full">
                        <span className="truncate">{name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="default"
                  disabled={loading || currentSentenceIndex === -1}
                  onClick={() => {
                    isTranslateOpen
                      ? setIsTranslateOpen(false)
                      : setIsTranslateOpen(true);
                    handleTranslate(currentSentenceIndex);
                  }}
                  className="flex flex-1 items-center gap-2"
                >
                  <>
                    <Languages className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {isTranslateOpen ? t("closeButton") : t("translate")}
                    </span>
                  </>
                </Button>
              </div>
            </div>

            {/* Audio Player Controls */}
            {togglePlayer && (
              <div className="bg-primary text-primary-foreground rounded p-4">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    className="h-10 w-10 rounded-full p-0"
                  >
                    <SkipBackIcon />
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 w-10 rounded-full p-0"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 w-10 rounded-full p-0"
                  >
                    <SkipForwardIcon />
                  </Button>
                  <div>
                    <Select defaultValue="1" onValueChange={handleSpeedTime}>
                      <SelectTrigger className="border-muted-foreground w-20 border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add padding when fixed controls are shown */}
      {shouldShowFixedControls && (
        <div
          className={cn(
            "pb-4",
            togglePlayer && isTranslateOpen
              ? "h-52"
              : togglePlayer
                ? "h-36"
                : isTranslateOpen
                  ? "h-32"
                  : "h-20",
          )}
        ></div>
      )}

      {/* Keep normal audio player when not fixed */}
      {togglePlayer && !shouldShowFixedControls && (
        <div
          id="audioPlayer"
          className="bg-primary text-primary-foreground my-2 rounded p-4 transition-all duration-300"
        >
          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" className="h-10 w-10 rounded-full p-0">
              <SkipBackIcon />
            </Button>
            <Button
              id="playPauseButton"
              variant="secondary"
              className="h-10 w-10 rounded-full p-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <Button variant="secondary" className="h-10 w-10 rounded-full p-0">
              <SkipForwardIcon />
            </Button>
            <div>
              <Select defaultValue="1" onValueChange={handleSpeedTime}>
                <SelectTrigger className="border-muted-foreground w-20 border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="0.75">0.75x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Keep normal translate when not fixed */}
      {isTranslateOpen && !shouldShowFixedControls && (
        <div className="flex h-32 flex-col items-center justify-between transition-all duration-300 md:h-24">
          <Separator />
          <p className="text-center text-green-500">{translate}</p>
          <Separator />
        </div>
      )}

      {(() => {
        if (!Array.isArray(article.sentences)) {
          // Fallback to original paragraphs if no sentences
          return paragraphs.map((p, index) => (
            <p
              key={index}
              className="font-article mb-2 indent-4 text-lg hyphens-auto whitespace-pre-wrap"
            >
              {p}
            </p>
          ));
        }

        // Group sentences into paragraphs using sequential assignment.
        // Walking sentenceIdx forward monotonically means each sentence is
        // claimed by exactly one paragraph — no duplicates even when a short
        // sentence text is a substring of multiple paragraph strings.
        const groupSentencesIntoParagraphs = () => {
          const paragraphGroups: { paragraph: string; sentences: number[] }[] =
            [];
          const allSentences = article.sentences as SentenceTimepoint[];
          let sentenceIdx = 0;

          paragraphs.forEach((paragraph) => {
            const paragraphSentences: number[] = [];

            // Consume consecutive sentences that appear in this paragraph text
            while (sentenceIdx < allSentences.length) {
              const sentText = allSentences[sentenceIdx].sentence.trim();
              if (paragraph.includes(sentText)) {
                paragraphSentences.push(sentenceIdx);
                sentenceIdx++;
              } else {
                break;
              }
            }

            if (paragraphSentences.length > 0) {
              paragraphGroups.push({
                paragraph,
                sentences: paragraphSentences,
              });
            }
          });

          // Append any unmatched trailing sentences to the last paragraph
          if (sentenceIdx < allSentences.length && paragraphGroups.length > 0) {
            const last = paragraphGroups[paragraphGroups.length - 1];
            while (sentenceIdx < allSentences.length) {
              last.sentences.push(sentenceIdx++);
            }
          }

          return paragraphGroups;
        };

        const paragraphGroups = groupSentencesIntoParagraphs();

        return paragraphGroups.map((group, groupIndex) => {
          return (
            <div key={groupIndex} className="flex flex-col gap-4">
              <Image
                className="rounded-lg shadow-xl"
                src={
                  getArticleImageUrl(article.id, groupIndex + 1) || `/nopic.png`
                }
                alt={`${article.title} - illustration ${groupIndex + 1}`}
                width={1024}
                height={1024}
                unoptimized
              />
              <p className="mb-4 indent-8 whitespace-pre-wrap">
                {group.sentences.map((sentenceIndex) => {
                  const sentence = article.sentences?.[sentenceIndex];
                  const isCurrentSentence =
                    sentenceIndex === currentSentenceIndex;

                  return (
                    <ContextMenu key={sentenceIndex}>
                      <ContextMenuTrigger>
                        <span
                          ref={isCurrentSentence ? currentSentenceRef : null}
                          className={`font-article rounded px-0.5 text-lg transition-all duration-200 md:text-xl ${
                            sentenceIndex === currentSentenceIndex
                              ? "bg-blue-300 dark:bg-blue-900/70"
                              : ""
                          }`}
                        >
                          {(() => {
                            if (!sentence) return null;
                            const parts = splitIntoDisplayParts(sentence.sentence);
                            let displayWordIdx = 0;

                            return parts.map((part, partIndex) => {
                              const isWord = isActualWordPart(part);
                              const wordIdx = isWord ? displayWordIdx : -1;
                              if (isWord) displayWordIdx++;

                              const isCurrentWord =
                                sentenceIndex === currentSentenceIndex &&
                                wordIdx !== -1 &&
                                wordIdx === currentWordIndex;

                              return (
                                <span
                                  key={partIndex}
                                  className={cn(
                                    isWord
                                      ? "cursor-pointer rounded transition-colors duration-150"
                                      : "",
                                    isCurrentWord && isPlaying
                                      ? "bg-blue-500 text-white"
                                      : isWord
                                        ? "hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                        : "",
                                  )}
                                  onClick={() =>
                                    handleWordClick(
                                      sentenceIndex,
                                      wordIdx,
                                    )
                                  }
                                >
                                  {part}
                                </span>
                              );
                            });
                          })()}
                        </span>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-50">
                        <ContextMenuItem
                          inset
                          disabled={loading || currentSentenceIndex === -1}
                          onClick={() => handleTranslateClick(sentenceIndex)}
                        >
                          {t("translate")}
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </p>
            </div>
          );
        });
      })()}
    </div>
  );
}
