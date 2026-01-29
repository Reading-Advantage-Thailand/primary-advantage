"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LanguagesIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface TranslationToggleProps {
  showTranslation: boolean;
  selectedLanguage: "th" | "cn" | "tw" | "vi";
  onToggle: () => void;
  onLanguageChange: (language: "th" | "cn" | "tw" | "vi") => void;
  className?: string;
}

const LANGUAGE_OPTIONS = [
  { value: "th", label: "🇹🇭 ไทย", emoji: "🇹🇭" },
  { value: "cn", label: "🇨🇳 中文", emoji: "🇨🇳" },
  { value: "tw", label: "🇹🇼 繁體", emoji: "🇹🇼" },
  { value: "vi", label: "🇻🇳 Tiếng Việt", emoji: "🇻🇳" },
] as const;

export default function TranslationToggle({
  showTranslation,
  selectedLanguage,
  onToggle,
  onLanguageChange,
  className,
}: TranslationToggleProps) {
  const selectedOption = LANGUAGE_OPTIONS.find(
    (opt) => opt.value === selectedLanguage,
  );
  const tCommon = useTranslations("common");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-gradient-to-r from-emerald-50 to-teal-50 p-2 sm:p-3 dark:from-emerald-950/30 dark:to-teal-950/30",
        className,
      )}
    >
      {/* Language selector */}
      <Select
        value={selectedLanguage}
        onValueChange={(value) =>
          onLanguageChange(value as "th" | "cn" | "tw" | "vi")
        }
      >
        <SelectTrigger className="h-10 w-36 rounded-full border-2 border-emerald-300 bg-white text-sm sm:h-12 sm:w-42 dark:bg-gray-800">
          <LanguagesIcon className="mr-1 h-4 w-4 text-emerald-600" />
          <SelectValue>{selectedOption?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LANGUAGE_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-sm"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Toggle button - Large and kid-friendly */}
      <Button
        variant={showTranslation ? "default" : "outline"}
        onClick={onToggle}
        className={cn(
          "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all sm:h-12 sm:px-6 sm:text-base",
          showTranslation
            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:from-emerald-600 hover:to-teal-600"
            : "border-2 border-emerald-300 bg-white hover:bg-emerald-50 dark:bg-gray-800 dark:hover:bg-emerald-900/30",
        )}
      >
        {showTranslation ? (
          <>
            <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="xs:inline hidden">{tCommon("hide")}</span>
            <span className="xs:hidden">{tCommon("hide")}</span>
          </>
        ) : (
          <>
            <EyeOffIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="xs:inline hidden">{tCommon("translate")}</span>
            <span className="xs:hidden">{tCommon("translate")}</span>
          </>
        )}
      </Button>

      {/* Current status indicator */}
      {showTranslation && (
        <div className="hidden items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700 sm:flex dark:bg-emerald-900/50 dark:text-emerald-300">
          <span>คำแปล:</span>
          <span className="font-medium">
            {selectedOption?.label.split(" ")[1] || selectedLanguage}
          </span>
        </div>
      )}
    </div>
  );
}
