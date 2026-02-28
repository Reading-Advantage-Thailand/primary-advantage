import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";

interface ComboIndicatorProps {
  streak: number;
}

export function ComboIndicator({ streak }: ComboIndicatorProps) {
  if (streak < 2) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={streak}
        initial={{ scale: 0.5, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="absolute bottom-4 left-4 z-30 flex items-center gap-2"
      >
        <div className="group relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-orange-500/50 blur-xl" />
          <div className="relative flex -rotate-2 transform items-center gap-1 rounded-full border-2 border-orange-400 bg-linear-to-r from-orange-600 to-red-600 px-4 py-2 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]">
            <Flame className="h-5 w-5 animate-bounce fill-yellow-300 text-yellow-300" />
            <span className="text-lg font-black tracking-wider italic">
              COMBO
            </span>
            <span className="text-2xl font-black text-yellow-300 drop-shadow-md">
              x{streak}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
