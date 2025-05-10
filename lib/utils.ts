import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanGenre(genre: string) {
  return genre.replace(/\s*\(.*?\)\s*$/, "");
}
