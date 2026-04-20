"use client";

import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface StickyHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyHeader({ children, className }: StickyHeaderProps) {
  const { scrollDirection, isAtTop } = useScrollDirection(8);
  const isMobile = useIsMobile();

  const hidden = isMobile && scrollDirection === "down" && !isAtTop;

  return (
    <header
      className={cn(
        "bg-background sticky top-0 z-40 border-b",
        "transition-all duration-300 ease-in-out will-change-transform",
        !isAtTop && "shadow-sm",
        hidden && "-translate-y-full",
        className,
      )}
    >
      {children}
    </header>
  );
}
