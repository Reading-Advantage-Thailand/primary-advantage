"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  Headphones,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { StoryChapterDetail } from "@/types/story";
import { SentenceTimepoint } from "@/types";
import { getStorieImageUrl, getAudioUrl } from "@/lib/storage-config";
import { useRouter } from "@/i18n/navigation";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import AudioPlayerControls from "./audio-player-controls";
import HighlightedPassage from "./highlighted-passage";
import TranslationToggle from "./translation-toggle";
import FloatingAudioControls from "./mobile-floating-controls";
import { useLocale, useTranslations } from "next-intl";

interface StorieContentProps {
  chapter: StoryChapterDetail;
}

export default function StorieContent({ chapter }: StorieContentProps) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const locale = useLocale();

  // Parse sentences from chapter data
  const sentences = useMemo(() => {
    if (!chapter.sentences || !Array.isArray(chapter.sentences)) {
      return [];
    }
    return chapter.sentences as SentenceTimepoint[];
  }, [chapter.sentences]);

  // Parse translations from chapter data
  const translations = useMemo(() => {
    if (!chapter.translatedSentences) {
      return null;
    }
    return chapter.translatedSentences as {
      th?: string[];
      cn?: string[];
      tw?: string[];
      vi?: string[];
    };
  }, [chapter.translatedSentences]);

  // Audio URL
  const audioUrl = useMemo(() => {
    if (chapter.audioSentencesUrl) {
      return getAudioUrl(chapter.audioSentencesUrl);
    }
    // Fallback to constructed URL
    return getAudioUrl(
      `audios/story/${chapter.storyId}-${chapter.chapterNumber}.mp3`,
    );
  }, [chapter.audioSentencesUrl, chapter.storyId, chapter.chapterNumber]);

  // Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState<
    "th" | "cn" | "tw" | "vi"
  >("th");

  // Audio player state
  const [isAudioMode, setIsAudioMode] = useState(false);

  // Floating controls visibility state
  const [showFloatingControls, setShowFloatingControls] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when main controls are out of view
  useEffect(() => {
    if (!isAudioMode || !controlsRef.current) {
      setShowFloatingControls(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Show floating controls when main controls are NOT visible
        const [entry] = entries;
        setShowFloatingControls(!entry.isIntersecting);
      },
      {
        threshold: 0.1, // Trigger when less than 10% visible
        rootMargin: "-50px 0px 0px 0px", // Add some margin at top
      },
    );

    observer.observe(controlsRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isAudioMode]);

  // Scroll to top handler
  const handleScrollToTop = useCallback(() => {
    controlsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    currentSentenceIndex,
    currentWordIndex,
    playbackRate,
    isLoaded,
    error,
    play,
    togglePlay,
    seekTo,
    seekToWord,
    setPlaybackRate,
    reset,
  } = useAudioPlayer({
    audioUrl: isAudioMode ? audioUrl : null,
    sentences,
    onEnded: () => {
      // Optional: auto-advance to next chapter or show completion
    },
  });

  // Check if audio/sentences are available
  const hasAudioSupport = sentences.length > 0;

  // Handle "Listen and read along" button - just enable audio mode, don't auto-play
  const handleStartListening = () => {
    setIsAudioMode(true);
    // Don't auto-play, let user click play button
  };

  // Handle word click for seeking
  const handleWordClick = (sentenceIndex: number, wordIndex: number) => {
    if (isAudioMode) {
      seekToWord(sentenceIndex, wordIndex);
      if (!isPlaying) {
        play();
      }
    }
  };

  // Handle sentence click
  const handleSentenceClick = (sentenceIndex: number) => {
    if (isAudioMode && sentences[sentenceIndex]) {
      seekTo(sentences[sentenceIndex].startTime);
      if (!isPlaying) {
        play();
      }
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Hidden audio element */}
      {isAudioMode && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      <CardHeader className="space-y-4">
        <CardTitle className="font-article text-2xl font-bold md:text-3xl lg:text-4xl">
          {chapter.title}
        </CardTitle>

        {/* Metadata badges */}
        <div className="flex flex-wrap gap-2">
          {chapter.story.raLevel && (
            <Badge variant="secondary" className="text-xs sm:text-sm">
              📚 {tCommon("ralevel", { level: chapter.story.raLevel })}
            </Badge>
          )}
          {chapter.story.cefrLevel && (
            <Badge variant="secondary" className="text-xs sm:text-sm">
              🎯 {tCommon("cefrlevel", { level: chapter.story.cefrLevel })}
            </Badge>
          )}
          {chapter.story.genre && (
            <Badge variant="outline" className="text-xs sm:text-sm">
              📖 {chapter.story.genre}
            </Badge>
          )}
        </div>

        <CardDescription className="font-article text-base leading-relaxed md:text-lg">
          {(chapter.translatedSummary && chapter.translatedSummary[locale]) ||
            chapter.summary}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Listen and Read Along Button - Only show if not in audio mode */}
        {!isAudioMode && hasAudioSupport && (
          <Button
            onClick={handleStartListening}
            className="h-14 w-full gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-base font-semibold shadow-lg transition-all hover:from-blue-600 hover:to-purple-600 hover:shadow-xl sm:h-16 sm:text-lg"
          >
            <Headphones className="h-6 w-6 sm:h-7 sm:w-7" />
            {tCommon("listenandread")}
          </Button>
        )}

        {/* Audio Player Controls - Show when in audio mode */}
        {isAudioMode && (
          <div ref={controlsRef} className="sticky top-0 z-10">
            <AudioPlayerControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              playbackRate={playbackRate}
              isLoaded={isLoaded}
              error={error}
              onPlayPause={togglePlay}
              onSeek={seekTo}
              onPlaybackRateChange={setPlaybackRate}
              onReset={() => {
                reset();
                setIsAudioMode(false);
              }}
            />
          </div>
        )}

        {/* Translation Toggle */}
        {hasAudioSupport && (
          <TranslationToggle
            showTranslation={showTranslation}
            selectedLanguage={translationLanguage}
            onToggle={() => setShowTranslation(!showTranslation)}
            onLanguageChange={setTranslationLanguage}
          />
        )}

        {/* Chapter Image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-lg sm:aspect-video md:aspect-[16/10]">
          <Image
            className="object-cover"
            src={getStorieImageUrl(chapter.storyId, chapter.chapterNumber)}
            alt={chapter.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
            priority
            unoptimized
          />
        </div>

        {/* Reading Content */}
        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-inner sm:p-6 md:p-8 dark:from-amber-950/20 dark:to-orange-950/20">
          {/* Reading mode indicator */}
          {isAudioMode && (
            <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
              <BookOpenIcon className="h-4 w-4" />
              <span>คลิกที่คำเพื่อเล่นจากจุดนั้น</span>
            </div>
          )}

          {/* Highlighted Passage or Plain Text */}
          {hasAudioSupport ? (
            <HighlightedPassage
              sentences={sentences}
              translations={translations}
              currentSentenceIndex={currentSentenceIndex}
              currentWordIndex={currentWordIndex}
              isPlaying={isPlaying}
              showTranslation={showTranslation}
              translationLanguage={translationLanguage}
              onWordClick={handleWordClick}
              onSentenceClick={handleSentenceClick}
            />
          ) : (
            // Fallback to plain text when no sentences available
            <p className="font-article text-lg leading-loose md:text-xl">
              {chapter.passage}
            </p>
          )}
        </div>

        {/* Chapter Navigation */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {chapter.chapterNumber > 1 ? (
            <Button
              variant="outline"
              className="h-12 w-full gap-2 rounded-xl text-base sm:h-14 sm:w-auto sm:px-6"
              onClick={() =>
                router.push(
                  `/student/stories/${chapter.storyId}/${chapter.chapterNumber - 1}`,
                )
              }
            >
              <ArrowLeftIcon className="h-5 w-5" />
              {tCommon("previouschapter")}
            </Button>
          ) : (
            <div className="hidden sm:block" />
          )}

          {chapter.chapterNumber < chapter.story.totalChapters && (
            <Button
              variant="default"
              className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-base shadow-md hover:from-green-600 hover:to-emerald-600 sm:h-14 sm:w-auto sm:px-6"
              onClick={() =>
                router.push(
                  `/student/stories/${chapter.storyId}/${chapter.chapterNumber + 1}`,
                )
              }
            >
              {tCommon("nextchapter")}
              <ArrowRightIcon className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-4 text-sm">
          <AlertCircle className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
          <p className="text-muted-foreground leading-relaxed">
            <strong>For language learners:</strong> This reading passage and its
            supporting visuals are designed for educational purposes. The
            computer-generated audio helps with pronunciation and listening
            practice. As with any learning resource, consider cross-referencing
            any facts used in academic work.
          </p>
        </div>
      </CardFooter>

      {/* Floating Audio Controls - Show on all devices when controls are out of view */}
      {isAudioMode && (
        <FloatingAudioControls
          isVisible={showFloatingControls}
          isPlaying={isPlaying}
          showTranslation={showTranslation}
          translationLanguage={translationLanguage}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={togglePlay}
          onToggleTranslation={() => setShowTranslation(!showTranslation)}
          onLanguageChange={setTranslationLanguage}
          onSeek={seekTo}
          onClose={() => {
            reset();
            setIsAudioMode(false);
          }}
          onScrollToTop={handleScrollToTop}
        />
      )}
    </Card>
  );
}
