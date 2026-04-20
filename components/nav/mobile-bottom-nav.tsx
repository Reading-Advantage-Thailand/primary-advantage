"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "@/types";
import { hasAnyPermission, UserForPermissions } from "@/lib/permissions";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileNavStore } from "@/store/useMobileNavStore";
import * as Icons from "lucide-react";
import { LucideIcon, Lock, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

interface MobileBottomNavProps {
  items: SidebarNavItem[];
  user?: UserForPermissions | null;
}

export function MobileBottomNav({ items, user }: MobileBottomNavProps) {
  const path = usePathname();
  const t = useTranslations("Sidebar");
  const { isOpen, open } = useMobileNavStore();
  const { scrollDirection, isAtTop } = useScrollDirection(8);
  const isMobile = useIsMobile();

  const hidden = isMobile && scrollDirection === "down" && !isAtTop;

  const hasItemPermission = (item: SidebarNavItem | any) => {
    if (!item.requiredPermissions?.length) return true;
    return hasAnyPermission(user, item.requiredPermissions);
  };

  const allVisible = items.filter(
    (item) => !(item.hideWhenNoPermission && !hasItemPermission(item)),
  );

  // Show first 4 on bottom bar; rest go to drawer via "More"
  const visibleItems = allVisible.slice(0, 4);
  const hasOverflow = allVisible.length > 4;

  const getHref = (item: SidebarNavItem): string => {
    if (item.href) return item.href;
    if (item.items?.length) return item.items[0].href;
    return "#";
  };

  const isActive = (item: SidebarNavItem): boolean => {
    const href = item.href;
    if (href) return path === href || path.startsWith(href + "/");
    if (item.items) return item.items.some((sub) => path === sub.href);
    return false;
  };

  if (!visibleItems.length) return null;

  return (
    <nav
      aria-label="Bottom navigation"
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border/60 bg-background/90 backdrop-blur-xl",
        "transition-transform duration-300 ease-in-out will-change-transform",
        hidden && "translate-y-full",
      )}
    >
      <div
        className="flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {visibleItems.map((item, index) => {
          const active = isActive(item);
          const isLocked = !hasItemPermission(item);
          const href = item.disabled || isLocked ? "#" : getHref(item);
          const Icon = item.icon
            ? (Icons[item.icon as keyof typeof Icons] as LucideIcon)
            : null;

          return (
            <Link
              key={index}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={t(item.title)}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-center",
                "min-h-[56px] transition-all duration-200 active:scale-95",
                active
                  ? "text-cyan-400"
                  : "text-muted-foreground hover:text-foreground/80",
                (item.disabled || isLocked) && "pointer-events-none opacity-50",
              )}
              onClick={(e) => {
                if (item.disabled || isLocked) e.preventDefault();
              }}
            >
              {/* Active pill indicator */}
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-b-full bg-cyan-400",
                  "transition-all duration-300",
                  active ? "w-8 opacity-100" : "w-0 opacity-0",
                )}
              />
              <span className={cn("transition-transform duration-200", active && "scale-110")}>
                {isLocked ? (
                  <Lock className="h-5 w-5" />
                ) : Icon ? (
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      active && "drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]",
                    )}
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium leading-none capitalize tracking-wide",
                  active ? "opacity-100" : "opacity-70",
                )}
              >
                {t(item.title)}
              </span>
            </Link>
          );
        })}

        {/* "More" tab — active when drawer is open */}
        {hasOverflow && (
          <button
            onClick={open}
            aria-label="More navigation options"
            aria-expanded={isOpen}
            aria-controls="mobile-nav-drawer"
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5",
              "min-h-[56px] transition-all duration-200 active:scale-95",
              isOpen
                ? "text-cyan-400"
                : "text-muted-foreground hover:text-foreground/80",
            )}
          >
            {/* Active pill when drawer open */}
            <span
              className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-b-full bg-cyan-400",
                "transition-all duration-300",
                isOpen ? "w-8 opacity-100" : "w-0 opacity-0",
              )}
            />
            <MoreHorizontal
              className={cn(
                "h-5 w-5 transition-all duration-200",
                isOpen && "scale-110 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]",
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium leading-none capitalize tracking-wide",
                isOpen ? "opacity-100" : "opacity-70",
              )}
            >
              More
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
