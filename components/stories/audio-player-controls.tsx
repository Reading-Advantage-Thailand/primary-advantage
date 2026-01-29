"use client";

import React, { useRef, useState, useCallback } from "react";
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
  RotateCcwIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLoaded: boolean;
  error: string | null;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onReset: () => void;
  className?: string;
}

// Format seconds to mm:ss
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AudioPlayerControls({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  isLoaded,
  error,
  onPlayPause,
  onSeek,
  onPlaybackRateChange,
  onReset,
  className,
}: AudioPlayerControlsProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  // Use drag progress when dragging, otherwise use actual progress
  const displayProgress = isDragging
    ? dragProgress
    : duration > 0
      ? (currentTime / duration) * 100
      : 0;

  // Calculate time from mouse/touch position
  const calculateTimeFromPosition = useCallback(
    (clientX: number) => {
      if (!progressRef.current || !duration) return 0;
      const rect = progressRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      return percent * duration;
    },
    [duration],
  );

  // Handle click on progress bar
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || isDragging) return;
    const newTime = calculateTimeFromPosition(e.clientX);
    onSeek(newTime);
  };

  // Handle drag start
  const handleDragStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (!duration) return;
    e.preventDefault();
    setIsDragging(true);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const newTime = calculateTimeFromPosition(clientX);
    setDragProgress((newTime / duration) * 100);

    // Add global listeners for drag
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveClientX =
        "touches" in moveEvent
          ? moveEvent.touches[0].clientX
          : (moveEvent as MouseEvent).clientX;
      const moveTime = calculateTimeFromPosition(moveClientX);
      setDragProgress((moveTime / duration) * 100);
    };

    const handleEnd = (endEvent: MouseEvent | TouchEvent) => {
      const endClientX =
        "changedTouches" in endEvent
          ? endEvent.changedTouches[0].clientX
          : (endEvent as MouseEvent).clientX;
      const finalTime = calculateTimeFromPosition(endClientX);
      onSeek(Math.max(0, Math.min(finalTime, duration)));
      setIsDragging(false);

      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleMove);
    document.addEventListener("touchend", handleEnd);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-sm dark:from-blue-950/30 dark:to-purple-950/30",
        className,
      )}
    >
      {/* Error state */}
      {error && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-red-100 p-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <VolumeXIcon className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Main controls row */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {/* Reset button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onReset}
          disabled={!isLoaded}
          className="h-10 w-10 rounded-full hover:bg-blue-100 sm:h-12 sm:w-12 dark:hover:bg-blue-900/50"
          aria-label="เริ่มใหม่"
        >
          <XIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>

        {/* Play/Pause button - Extra large for kids */}
        <Button
          variant="default"
          size="icon"
          onClick={onPlayPause}
          disabled={!isLoaded}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-200 sm:h-16 sm:w-16",
            isPlaying
              ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
            !isLoaded && "opacity-50",
          )}
          aria-label={isPlaying ? "หยุด" : "เล่น"}
        >
          {isPlaying ? (
            <PauseIcon className="h-7 w-7 fill-white text-white sm:h-8 sm:w-8" />
          ) : (
            <PlayIcon className="h-7 w-7 fill-white text-white sm:h-8 sm:w-8" />
          )}
        </Button>

        {/* Speed control */}
        <Select
          value={playbackRate.toString()}
          onValueChange={(value) => onPlaybackRateChange(parseFloat(value))}
          disabled={!isLoaded}
        >
          <SelectTrigger
            className={cn(
              "h-10 w-16 rounded-full text-xs font-bold sm:h-12 sm:w-28 sm:text-sm",
              playbackRate === 0.75
                ? "border-blue-400 bg-blue-100 dark:bg-blue-900/50"
                : playbackRate === 1.25
                  ? "border-purple-400 bg-purple-100 dark:bg-purple-900/50"
                  : "border-gray-300",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.5" className="text-sm">
              🐢 0.5x
            </SelectItem>
            <SelectItem value="0.75" className="text-sm">
              🐌 0.75x
            </SelectItem>
            <SelectItem value="1" className="text-sm">
              ⏱️ 1x
            </SelectItem>
            <SelectItem value="1.25" className="text-sm">
              🐇 1.25x
            </SelectItem>
            <SelectItem value="1.5" className="text-sm">
              🚀 1.5x
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Progress bar with drag support */}
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground w-10 text-center text-xs font-medium sm:w-12 sm:text-sm">
          {formatTime(
            isDragging ? (dragProgress / 100) * duration : currentTime,
          )}
        </span>

        <div
          ref={progressRef}
          className="relative flex-1 cursor-pointer touch-none select-none"
          onClick={handleProgressClick}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          {/* Progress bar track */}
          <div className="group relative h-4 sm:h-5">
            {/* Background track */}
            <div className="absolute inset-y-0 right-0 left-0 my-auto h-3 rounded-full bg-gray-200 sm:h-4 dark:bg-gray-700" />

            {/* Filled progress - no transition for smooth sync with playhead */}
            <div
              className={cn(
                "bg-primary absolute inset-y-0 left-0 my-auto h-3 rounded-full sm:h-4",
                isDragging && "bg-blue-500",
              )}
              style={{ width: `${displayProgress}%` }}
            />

            {/* Playhead indicator - draggable */}
            <div
              className={cn(
                "bg-primary absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-white shadow-lg sm:h-7 sm:w-7",
                isDragging && "scale-125 bg-blue-500",
              )}
              style={{
                left: `calc(${displayProgress}% - 12px)`,
              }}
            />
          </div>
        </div>

        <span className="text-muted-foreground w-10 text-center text-xs font-medium sm:w-12 sm:text-sm">
          {formatTime(duration)}
        </span>
      </div>

      {/* Audio indicator */}
      {isPlaying && (
        <div className="flex items-center justify-center gap-1">
          <Volume2Icon className="h-4 w-4 animate-pulse text-green-500" />
          <span className="text-xs text-green-600 dark:text-green-400">
            กำลังเล่นเสียง...
          </span>
        </div>
      )}
    </div>
  );
}
