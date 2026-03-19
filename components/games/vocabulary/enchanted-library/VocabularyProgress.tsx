import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Book, Star } from "lucide-react";
import type { VocabularyItem } from "@/store/useGameStore";

interface VocabularyProgressProps {
  vocabulary: VocabularyItem[];
  progress: Map<string, number>;
  isOpen: boolean;
  onClose: () => void;
}

export function VocabularyProgress({
  vocabulary,
  progress,
  isOpen,
  onClose,
}: VocabularyProgressProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 z-50 flex w-80 max-w-[90%] flex-col border-l-4 border-amber-300 bg-gradient-to-b from-amber-100 to-amber-200 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-amber-300/50 bg-white/30 p-4">
              <h3 className="flex items-center gap-2 text-xl font-bold text-amber-900">
                <Book className="h-6 w-6 text-amber-700" />
                My Grimoire
              </h3>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-amber-900 transition-colors hover:bg-black/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {vocabulary.map((item, i) => {
                const count = progress.get(item.term) || 0;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-white bg-white/60 p-3 shadow-sm"
                    data-testid={`vocab-row-${item.term}`}
                  >
                    <div>
                      <div className="font-bold text-amber-900">
                        {item.term}
                      </div>
                      <div className="text-sm text-amber-700">
                        {item.translation}
                      </div>
                    </div>
                    <div className="flex gap-1 text-amber-400 drop-shadow-sm">
                      <Star
                        className={`h-5 w-5 ${count >= 1 ? "fill-yellow-400 text-yellow-500" : "text-slate-300"}`}
                        data-testid="star"
                        data-filled={count >= 1}
                      />
                      <Star
                        className={`h-5 w-5 ${count >= 2 ? "fill-yellow-400 text-yellow-500" : "text-slate-300"}`}
                        data-testid="star"
                        data-filled={count >= 2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-amber-300/50 bg-white/30 p-4 text-center text-xs font-medium tracking-wider text-amber-800 uppercase">
              Collect all words twice!
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
