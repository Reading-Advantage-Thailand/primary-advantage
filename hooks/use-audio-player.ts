"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { SentenceTimepoint } from "@/types";

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentSentenceIndex: number;
  currentWordIndex: number;
  playbackRate: number;
  isLoaded: boolean;
  error: string | null;
}

interface UseAudioPlayerReturn extends AudioPlayerState {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  seekTo: (time: number) => void;
  seekToWord: (sentenceIndex: number, wordIndex: number) => void;
  seekToSentence: (sentenceIndex: number) => void;
  setPlaybackRate: (rate: number) => void;
  reset: () => void;
}

interface UseAudioPlayerOptions {
  audioUrl: string | null;
  sentences: SentenceTimepoint[];
  onSentenceChange?: (sentenceIndex: number) => void;
  onWordChange?: (wordIndex: number) => void;
  onEnded?: () => void;
}

export function useAudioPlayer({
  audioUrl,
  sentences,
  onSentenceChange,
  onWordChange,
  onEnded,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentSentenceIndex: -1,
    currentWordIndex: -1,
    playbackRate: 1,
    isLoaded: false,
    error: null,
  });

  // Find current sentence and word based on time
  const findCurrentPosition = useCallback(
    (time: number): { sentenceIndex: number; wordIndex: number } => {
      if (!sentences || sentences.length === 0) {
        return { sentenceIndex: -1, wordIndex: -1 };
      }

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];

        if (time >= sentence.startTime && time <= sentence.endTime) {
          // Find exact word match first
          for (let j = 0; j < sentence.words.length; j++) {
            const word = sentence.words[j];
            if (time >= word.start && time < word.end) {
              return { sentenceIndex: i, wordIndex: j };
            }
          }

          // No exact match - find the closest word (the one we're approaching or just passed)
          // This handles gaps between words in timestamps
          let closestWordIndex = -1;
          let minDistance = Infinity;

          for (let j = 0; j < sentence.words.length; j++) {
            const word = sentence.words[j];
            // Check if time is just before this word starts
            if (time < word.start) {
              const distance = word.start - time;
              if (distance < minDistance) {
                minDistance = distance;
                closestWordIndex = j;
              }
            }
            // Check if time is just after this word ends
            if (time >= word.end) {
              const distance = time - word.end;
              if (distance < minDistance) {
                minDistance = distance;
                closestWordIndex = j;
              }
            }
          }

          // If we're very close to a word (within 0.3 seconds), highlight it
          // Otherwise, keep the previous highlight stable
          if (closestWordIndex !== -1 && minDistance < 0.3) {
            return { sentenceIndex: i, wordIndex: closestWordIndex };
          }

          // Return -1 for word to keep previous word highlighted during gaps
          return { sentenceIndex: i, wordIndex: -1 };
        }
      }

      return { sentenceIndex: -1, wordIndex: -1 };
    },
    [sentences],
  );

  // Update time tracking using requestAnimationFrame for smooth updates
  const updateTimeTracking = useCallback(() => {
    if (!audioRef.current || !state.isPlaying) return;

    const currentTime = audioRef.current.currentTime;
    const { sentenceIndex, wordIndex } = findCurrentPosition(currentTime);

    setState((prev) => {
      // Don't update wordIndex if we're in a gap (wordIndex is -1)
      // Keep the previous word highlighted during gaps between words
      const effectiveWordIndex =
        wordIndex === -1 ? prev.currentWordIndex : wordIndex;

      const hasChanges =
        prev.currentTime !== currentTime ||
        prev.currentSentenceIndex !== sentenceIndex ||
        prev.currentWordIndex !== effectiveWordIndex;

      if (!hasChanges) return prev;

      // Trigger callbacks if indices changed
      if (prev.currentSentenceIndex !== sentenceIndex && sentenceIndex !== -1) {
        onSentenceChange?.(sentenceIndex);
      }
      if (
        prev.currentWordIndex !== effectiveWordIndex &&
        effectiveWordIndex !== -1
      ) {
        onWordChange?.(effectiveWordIndex);
      }

      return {
        ...prev,
        currentTime,
        currentSentenceIndex: sentenceIndex,
        currentWordIndex: effectiveWordIndex,
      };
    });

    animationFrameRef.current = requestAnimationFrame(updateTimeTracking);
  }, [state.isPlaying, findCurrentPosition, onSentenceChange, onWordChange]);

  // Start/stop animation frame loop based on playing state
  useEffect(() => {
    if (state.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTimeTracking);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, updateTimeTracking]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration,
        isLoaded: true,
        error: null,
      }));
    };

    const handleEnded = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        currentSentenceIndex: -1,
        currentWordIndex: -1,
      }));
      onEnded?.();
    };

    const handleError = () => {
      setState((prev) => ({
        ...prev,
        isLoaded: false,
        error: "Failed to load audio",
      }));
    };

    const handleCanPlay = () => {
      setState((prev) => ({
        ...prev,
        isLoaded: true,
      }));
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [audioUrl, onEnded]);

  const play = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setState((prev) => ({ ...prev, isPlaying: true, error: null }));
    } catch (error) {
      console.error("Failed to play audio:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to play audio",
      }));
    }
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlay = useCallback(async () => {
    if (state.isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [state.isPlaying, play, pause]);

  const seekTo = useCallback(
    (time: number) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = time;
      const { sentenceIndex, wordIndex } = findCurrentPosition(time);
      setState((prev) => ({
        ...prev,
        currentTime: time,
        currentSentenceIndex: sentenceIndex,
        currentWordIndex: wordIndex,
      }));
    },
    [findCurrentPosition],
  );

  const seekToWord = useCallback(
    (sentenceIndex: number, wordIndex: number) => {
      if (
        !sentences ||
        sentenceIndex < 0 ||
        sentenceIndex >= sentences.length
      ) {
        return;
      }

      const sentence = sentences[sentenceIndex];
      if (
        !sentence.words ||
        wordIndex < 0 ||
        wordIndex >= sentence.words.length
      ) {
        return;
      }

      const word = sentence.words[wordIndex];
      seekTo(word.start - 0.05); // Small offset for smooth transition
    },
    [sentences, seekTo],
  );

  const seekToSentence = useCallback(
    (sentenceIndex: number) => {
      if (
        !sentences ||
        sentenceIndex < 0 ||
        sentenceIndex >= sentences.length
      ) {
        return;
      }

      const sentence = sentences[sentenceIndex];
      seekTo(sentence.startTime);
    },
    [sentences, seekTo],
  );

  const setPlaybackRate = useCallback((rate: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = rate;
    setState((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  const reset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      currentSentenceIndex: -1,
      currentWordIndex: -1,
      playbackRate: 1,
      isLoaded: false,
      error: null,
    });
  }, []);

  return {
    audioRef,
    ...state,
    play,
    pause,
    togglePlay,
    seekTo,
    seekToWord,
    seekToSentence,
    setPlaybackRate,
    reset,
  };
}
