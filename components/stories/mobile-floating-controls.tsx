"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlayIcon,
  PauseIcon,
  XIcon,
  LanguagesIcon,
  ChevronUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingAudioControlsProps {
  isVisible: boolean;
  isPlaying: boolean;
  showTranslation: boolean;
  translationLanguage: "th" | "cn" | "tw" | "vi";
  currentTime: number;
  duration: number;
  playbackRate: number;
  onPlayPause: () => void;
  onToggleTranslation: () => void;
  onLanguageChange: (language: "th" | "cn" | "tw" | "vi") => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onClose: () => void;
  onScrollToTop: () => void;
  className?: string;
}

const LANGUAGE_OPTIONS = [
  { value: "th", label: "🇹🇭 ไทย" },
  { value: "cn", label: "🇨🇳 中文" },
  { value: "tw", label: "🇹🇼 繁體" },
  { value: "vi", label: "🇻🇳 Việt" },
] as const;

const SPEED_OPTIONS = [
  { value: 0.5, label: "🐢 0.5x" },
  { value: 0.75, label: "🐌 0.75x" },
  { value: 1, label: "🚶 1x" },
  { value: 1.25, label: "🏃 1.25x" },
  { value: 1.5, label: "🚀 1.5x" },
] as const;

// Format seconds to mm:ss
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function FloatingAudioControls({
  isVisible,
  isPlaying,
  showTranslation,
  translationLanguage,
  currentTime,
  duration,
  playbackRate,
  onPlayPause,
  onToggleTranslation,
  onLanguageChange,
  onSeek,
  onPlaybackRateChange,
  onClose,
  onScrollToTop,
  className,
}: FloatingAudioControlsProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  // Calculate progress from mouse/touch position
  const calculateProgress = useCallback(
    (clientX: number) => {
      if (!progressRef.current || duration <= 0) return 0;
      const rect = progressRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      return percent * duration;
    },
    [duration],
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      const time = calculateProgress(clientX);
      setDragProgress(time);
    },
    [calculateProgress],
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      const time = calculateProgress(clientX);
      setDragProgress(time);
    },
    [isDragging, calculateProgress],
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      onSeek(dragProgress);
      setIsDragging(false);
    }
  }, [isDragging, dragProgress, onSeek]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX);
  };

  // Document-level event listeners for drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleDragMove(touch.clientX);
    };
    const handleTouchEnd = () => handleDragEnd();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (!isVisible) return null;

  const displayTime = isDragging ? dragProgress : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "animate-in slide-in-from-bottom-4 fixed right-4 bottom-4 left-4 z-50 mx-auto max-w-2xl duration-300",
        className,
      )}
    >
      <div className="flex flex-col gap-2 rounded-2xl border bg-white/95 p-3 shadow-2xl backdrop-blur-sm dark:bg-gray-900/95">
        {/* Progress bar - draggable */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-muted-foreground text-xs">
            {formatTime(displayTime)}
          </span>
          <div
            ref={progressRef}
            className="relative h-4 flex-1 cursor-pointer touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Track background */}
            <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              {/* Filled progress */}
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Thumb/handle */}
            <div
              className={cn(
                "bg-primary absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md transition-transform",
                isDragging && "scale-125",
              )}
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 sm:h-11 sm:w-11 dark:bg-gray-800 dark:hover:bg-gray-700"
            aria-label="ปิดโหมดฟัง"
          >
            <XIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Center: Play/Pause button */}
          <Button
            variant="default"
            size="icon"
            onClick={onPlayPause}
            className={cn(
              "h-12 w-12 shrink-0 rounded-full shadow-lg sm:h-14 sm:w-14",
              isPlaying
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
            )}
            aria-label={isPlaying ? "หยุด" : "เล่น"}
          >
            {isPlaying ? (
              <PauseIcon className="h-6 w-6 fill-white text-white sm:h-7 sm:w-7" />
            ) : (
              <PlayIcon className="h-6 w-6 fill-white text-white sm:h-7 sm:w-7" />
            )}
          </Button>

          {/* Right: Translation controls */}
          <div className="flex items-center gap-1">
            {/* Translation toggle */}
            <Button
              variant={showTranslation ? "default" : "ghost"}
              size="icon"
              onClick={onToggleTranslation}
              className={cn(
                "h-10 w-10 shrink-0 rounded-full sm:h-11 sm:w-11",
                showTranslation
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700",
              )}
              aria-label={showTranslation ? "ซ่อนคำแปล" : "แสดงคำแปล"}
            >
              <LanguagesIcon
                className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5",
                  showTranslation && "text-white",
                )}
              />
            </Button>

            {/* Language selector - show when translation is on */}
            {showTranslation && (
              <Select
                value={translationLanguage}
                onValueChange={(value) =>
                  onLanguageChange(value as "th" | "cn" | "tw" | "vi")
                }
              >
                <SelectTrigger className="h-10 w-16 rounded-full border-0 bg-gray-100 text-xs sm:h-11 sm:w-24 sm:text-sm dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-sm"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Speed selector */}
            <Select
              value={playbackRate.toString()}
              onValueChange={(value) => onPlaybackRateChange(parseFloat(value))}
            >
              <SelectTrigger className="h-10 w-16 rounded-full border-0 bg-gray-100 text-xs sm:h-11 sm:w-20 sm:text-sm dark:bg-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPEED_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                    className="text-sm"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Scroll to top button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onScrollToTop}
              className="h-10 w-10 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 sm:h-11 sm:w-11 dark:bg-gray-800 dark:hover:bg-gray-700"
              aria-label="เลื่อนขึ้นด้านบน"
            >
              <ChevronUpIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
