"use client";

import { Badge } from "@/components/ui/badge";
import type { AiCapability } from "./types";

interface CapabilityBadgeProps {
  capability: string;
}

const CAP_STYLES: Record<AiCapability, string> = {
  TEXT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-transparent",
  IMAGE: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-transparent",
  STREAMING: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 border-transparent",
};

export function CapabilityBadge({ capability }: CapabilityBadgeProps) {
  const style = CAP_STYLES[capability as AiCapability] ?? "bg-gray-100 text-gray-700";
  return (
    <Badge className={style} variant="outline">
      {capability}
    </Badge>
  );
}
