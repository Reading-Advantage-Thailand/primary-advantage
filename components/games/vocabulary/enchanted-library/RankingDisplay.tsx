"use client";

import { motion } from "framer-motion";
import { Trophy, Medal, Award, User } from "lucide-react";
import { useState } from "react";
import type { Difficulty } from "@/lib/games/enchanted-library/enchantedLibrary";

interface RankingEntry {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
}

interface RankingDisplayProps {
  rankings: Record<Difficulty, RankingEntry[]>;
  currentUserId?: string;
  currentDifficulty?: Difficulty;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
  extreme: "Extreme",
};

export function RankingDisplay({
  rankings,
  currentUserId,
  currentDifficulty = "normal",
}: RankingDisplayProps) {
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>(currentDifficulty);

  const currentRankings = rankings[selectedDifficulty] || [];

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white/95 p-6 shadow-2xl">
      <div className="mb-6 flex items-center justify-center gap-3">
        <Trophy className="h-8 w-8 text-yellow-500" />
        <h2 className="text-2xl font-bold text-amber-900">Leaderboard</h2>
      </div>

      {/* Difficulty Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((difficulty) => (
          <button
            key={difficulty}
            onClick={() => setSelectedDifficulty(difficulty)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
              selectedDifficulty === difficulty
                ? "bg-amber-500 text-white shadow-md"
                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
            }`}
          >
            {DIFFICULTY_LABELS[difficulty]}
          </button>
        ))}
      </div>

      {/* Rankings List */}
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {currentRankings.length === 0 ? (
          <div className="py-8 text-center text-amber-600">
            <Award className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p>No rankings yet for this difficulty.</p>
            <p className="mt-1 text-sm">Be the first to play!</p>
          </div>
        ) : (
          currentRankings.map((entry, index) => {
            const isCurrentUser = entry.userId === currentUserId;
            const rank = index + 1;

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 rounded-lg p-3 transition-all ${
                  isCurrentUser
                    ? "border-2 border-amber-400 bg-linear-to-r from-amber-200 to-yellow-200 shadow-md"
                    : "bg-amber-50 hover:bg-amber-100"
                }`}
              >
                {/* Rank */}
                <div className="w-12 shrink-0 text-center">
                  {rank <= 3 ? (
                    <div className="flex justify-center">
                      {rank === 1 && (
                        <Trophy className="h-6 w-6 text-yellow-500" />
                      )}
                      {rank === 2 && (
                        <Medal className="h-6 w-6 text-gray-400" />
                      )}
                      {rank === 3 && (
                        <Medal className="h-6 w-6 text-amber-600" />
                      )}
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-amber-700">
                      #{rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="shrink-0">
                  {entry.image ? (
                    <img
                      src={entry.image}
                      alt={entry.name}
                      className="h-10 w-10 rounded-full border-2 border-amber-300"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-300">
                      <User className="h-6 w-6 text-amber-700" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate font-semibold ${isCurrentUser ? "text-amber-900" : "text-amber-800"}`}
                  >
                    {entry.name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs">(You)</span>
                    )}
                  </div>
                </div>

                {/* XP */}
                <div className="shrink-0">
                  <div className="rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-white">
                    {entry.xp.toLocaleString()} XP
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
