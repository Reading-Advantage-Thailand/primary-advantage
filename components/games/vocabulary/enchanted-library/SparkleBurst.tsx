"use client";

import React, { useMemo, useEffect } from "react";
import { motion } from "framer-motion";

interface SparkleBurstProps {
  x: number;
  y: number;
  onComplete: () => void;
}

export const SparkleBurst = React.memo(function SparkleBurst({
  x,
  y,
  onComplete,
}: SparkleBurstProps) {
  // Memoize random positions once so re-renders don't reset framer-motion targets
  const particles = useMemo(
    () =>
      Array.from({ length: 8 }, () => ({
        tx: (Math.random() - 0.5) * 120,
        ty: (Math.random() - 0.5) * 120,
      })),
    [],
  );

  // Safety timeout: auto-remove after 1s even if animation callback doesn't fire
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: `${x}%`, top: `${y}%` }}
      data-testid="sparkle-burst"
    >
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: p.tx,
            y: p.ty,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="sparkle-particle absolute h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
          onAnimationComplete={i === 0 ? onComplete : undefined}
          data-testid="sparkle-particle"
        />
      ))}
    </div>
  );
});
