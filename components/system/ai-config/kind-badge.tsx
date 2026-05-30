"use client";

import { Badge } from "@/components/ui/badge";
import type { AiProviderKind } from "./types";

interface KindBadgeProps {
  kind: string;
}

const KIND_STYLES: Record<AiProviderKind, string> = {
  VERTEX: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-transparent",
  OPENAI: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent",
  OPENAI_COMPATIBLE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-transparent",
};

const KIND_LABELS: Record<AiProviderKind, string> = {
  VERTEX: "Vertex",
  OPENAI: "OpenAI",
  OPENAI_COMPATIBLE: "OAI Compat",
};

export function KindBadge({ kind }: KindBadgeProps) {
  const style = KIND_STYLES[kind as AiProviderKind] ?? "bg-gray-100 text-gray-700";
  const label = KIND_LABELS[kind as AiProviderKind] ?? kind;
  return (
    <Badge className={style} variant="outline">
      {label}
    </Badge>
  );
}
