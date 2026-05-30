"use client";

/**
 * RelativeTime — displays a date as relative text (e.g. "2 hours ago")
 * with a tooltip showing the full ISO timestamp on hover.
 * Uses date-fns (already in package.json).
 */

import { formatDistanceToNow, format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface RelativeTimeProps {
  dateString: string; // ISO string
}

export function RelativeTime({ dateString }: RelativeTimeProps) {
  const date = new Date(dateString);
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const full = format(date, "PPpp"); // e.g. "May 28, 2026 at 3:42:00 PM"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default text-muted-foreground text-sm underline-offset-2 hover:underline">
            {relative}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{full}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
