import React from "react";
import { Progress } from "./ui/progress";
import { LEVELS_XP } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export default function ProgressBar({
  currentXP,
  currentLevel,
}: {
  currentXP: number;
  currentLevel: number;
}) {
  // Find the current level based on XP range
  const currentLevelData = LEVELS_XP.find(
    (level) => currentXP >= level.min && currentXP <= level.max,
  );

  // Use the last level if XP exceeds all levels
  const levelData = currentLevelData || LEVELS_XP[LEVELS_XP.length - 1];

  // Calculate progress within current level
  const levelMin = levelData.min;
  const levelMax = levelData.max;
  const progressValue = ((currentXP - levelMin) / (levelMax - levelMin)) * 100;

  return (
    <div className="flex w-full items-center gap-2 sm:w-3/4 md:w-1/4 xl:w-1/4">
      {/* Level Badge */}
      <div className="relative flex-shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-md shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 dark:from-cyan-600 dark:to-cyan-700 dark:shadow-cyan-400/20">
          <div className="text-center">
            <div className="text-[7px] leading-none font-semibold text-cyan-50/70 uppercase">
              RA
            </div>
            <div className="text-sm leading-tight font-bold text-white">
              {currentLevel}
            </div>
          </div>
        </div>
        {progressValue >= 90 && (
          <div className="absolute -top-0.5 -right-0.5">
            <Sparkles className="h-2 w-2 animate-pulse text-yellow-400 drop-shadow-sm" />
          </div>
        )}
      </div>

      {/* Progress Bar Container */}
      <div className="relative min-w-0 flex-1">
        {/* Background */}
        <div className="h-4 overflow-hidden rounded-full bg-slate-200/80 shadow-inner dark:bg-slate-700/50">
          {/* Progress Fill with Gradient */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 shadow-sm transition-all duration-500 ease-out dark:from-cyan-600 dark:via-cyan-500 dark:to-cyan-600"
            style={{ width: `${progressValue}%` }}
          >
            {/* Shine Effect */}
            <div className="h-full w-full rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/20" />
          </div>
        </div>

        {/* XP Text Overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-xs font-semibold text-slate-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] dark:text-slate-100 dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            <span className="hidden sm:inline">
              {currentXP.toLocaleString()} / {levelMax.toLocaleString()} XP
            </span>
            <span className="sm:hidden">{currentXP.toLocaleString()} XP</span>
          </p>
        </div>
      </div>
    </div>
  );
}
