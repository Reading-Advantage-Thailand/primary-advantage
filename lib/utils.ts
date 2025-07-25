import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanGenre(genre: string): string {
  return genre.replace(/\s*\(.*?\)\s*$/, "");
}

export function sanitizeTranslationKey(text: string): string {
  return cleanGenre(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove all special characters except spaces
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Replace multiple underscores with single underscore
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

export function generateSecureCode(length = 8): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => charset[x % charset.length]).join("");
}

export function calculateLevelAndCefrLevel(xpEarned: number, userXp: number) {
  const levels = [
    { min: 0, max: 4999, cefrLevel: "A1-", raLevel: 1 },
    { min: 5000, max: 10999, cefrLevel: "A1", raLevel: 2 },
    { min: 11000, max: 17999, cefrLevel: "A1+", raLevel: 3 },
    { min: 18000, max: 25999, cefrLevel: "A2-", raLevel: 4 },
    { min: 26000, max: 34999, cefrLevel: "A2", raLevel: 5 },
    { min: 35000, max: 44999, cefrLevel: "A2+", raLevel: 6 },
    { min: 45000, max: 55999, cefrLevel: "B1-", raLevel: 7 },
    { min: 56000, max: 67999, cefrLevel: "B1", raLevel: 8 },
    { min: 68000, max: 80999, cefrLevel: "B1+", raLevel: 9 },
    { min: 81000, max: 94999, cefrLevel: "B2-", raLevel: 10 },
    { min: 95000, max: 109999, cefrLevel: "B2", raLevel: 11 },
    { min: 110000, max: 125999, cefrLevel: "B2+", raLevel: 12 },
    { min: 126000, max: 142999, cefrLevel: "C1-", raLevel: 13 },
    { min: 143000, max: 160999, cefrLevel: "C1", raLevel: 14 },
    { min: 161000, max: 179999, cefrLevel: "C1+", raLevel: 15 },
    { min: 180000, max: 199999, cefrLevel: "C2-", raLevel: 16 },
    { min: 200000, max: 220999, cefrLevel: "C2", raLevel: 17 },
    { min: 221000, max: 242999, cefrLevel: "C2+", raLevel: 18 },
  ];

  const newXp = userXp + xpEarned;
  const level = levels.find(
    (level) => xpEarned >= level.min && xpEarned <= level.max,
  );
  const cefrLevel = level?.cefrLevel || "A1-";
  const raLevel = level?.raLevel || 1;

  return { newXp, raLevel, cefrLevel };
}

export function convertCefrLevel(cefrLevel: string) {
  const levels = [
    { cefrLevel: "A1-", raLevel: 1 },
    { cefrLevel: "A1", raLevel: 2 },
    { cefrLevel: "A1+", raLevel: 3 },
    { cefrLevel: "A2-", raLevel: 4 },
    { cefrLevel: "A2", raLevel: 5 },
    { cefrLevel: "A2+", raLevel: 6 },
    { cefrLevel: "B1-", raLevel: 7 },
    { cefrLevel: "B1", raLevel: 8 },
    { cefrLevel: "B1+", raLevel: 9 },
    { cefrLevel: "B2-", raLevel: 10 },
    { cefrLevel: "B2", raLevel: 11 },
    { cefrLevel: "B2+", raLevel: 12 },
    { cefrLevel: "C1-", raLevel: 13 },
    { cefrLevel: "C1", raLevel: 14 },
    { cefrLevel: "C1+", raLevel: 15 },
    { cefrLevel: "C2-", raLevel: 16 },
    { cefrLevel: "C2", raLevel: 17 },
    { cefrLevel: "C2+", raLevel: 18 },
  ];

  const level = levels.find((level) => level.cefrLevel === cefrLevel);
  return level?.raLevel || 1;
}

export function convertLocaleFull(locale: string) {
  const localeMap: Record<string, string> = {
    en: "English",
    th: "Thai",
    cn: "Chinese",
    tw: "Taiwan",
    vi: "Vietnamese",
  };
  return localeMap[locale as keyof typeof localeMap] || locale;
}
