"use client";

import { useCallback } from "react";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export function useSound() {
  const playSound = useCallback((type: "success" | "error" | "missile-hit") => {
    // In a real browser environment, we would load and play audio files.
    // For this sandbox, we'll implement a simple placeholder using the Web Audio API
    // to generate simple beep sounds if possible, or just log.

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === "success") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
      } else if (type === "error") {
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(220, ctx.currentTime); // A3
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.2);
      } else if (type === "missile-hit") {
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(110, ctx.currentTime); // A2
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, []);

  return { playSound };
}
