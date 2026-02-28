import React from "react";
import { motion } from "framer-motion";

type HealthBarTone = "player" | "enemy";

interface HealthBarProps {
  current: number;
  max: number;
  label: string;
  tone: HealthBarTone;
}

export function HealthBar({ current, max, label, tone }: HealthBarProps) {
  const safeMax = Math.max(0, max);
  const clamped = Math.max(0, Math.min(current, safeMax));
  const percentage = safeMax > 0 ? (clamped / safeMax) * 100 : 0;
  const barColor = tone === "player" ? "bg-emerald-500" : "bg-rose-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-semibold">{label}</span>
        <span className="text-muted-foreground">
          {clamped} / {safeMax}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuenow={clamped}
        aria-valuemax={safeMax}
        className="bg-muted h-3 w-full overflow-hidden rounded-full"
      >
        <motion.div
          className={`h-full ${barColor}`}
          initial={false}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>
    </div>
  );
}
