"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  LucideIcon,
  Lock,
} from "lucide-react";
import * as Icons from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  hasAnyPermission,
  UserForPermissions,
} from "@/lib/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarNavProps {
  items?: SidebarNavItem[];
  user?: UserForPermissions | null | undefined;
}

export function SidebarNav({ items, user }: SidebarNavProps) {
  const path = usePathname();
  const t = useTranslations("Sidebar");
  const tSubItem = useTranslations("Sidebar.subItem");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const isItemActive = (href: string) => path === href;

  const isParentActive = (href: string) => path.startsWith(href + "/");

  const isAnyChildActive = (items: any[]) =>
    items?.some((child) => child.href && isItemActive(child.href));

  const hasExactChildMatch = (items: any[]) =>
    items?.some((child) => child.href && path === child.href);

  const hasItemPermission = (item: SidebarNavItem | any) => {
    if (!item.requiredPermissions?.length) return true;
    return hasAnyPermission(user, item.requiredPermissions);
  };

  const shouldHideItem = (item: SidebarNavItem | any) =>
    item.hideWhenNoPermission && !hasItemPermission(item);

  const isItemLocked = (item: SidebarNavItem | any) =>
    !item.hideWhenNoPermission && !hasItemPermission(item);

  const filterItems = (itemsList: any[]) =>
    itemsList?.filter((item) => !shouldHideItem(item)) || [];

  if (!items?.length) return null;

  const visibleItems = filterItems(items);

  return (
    <TooltipProvider>
      {path.startsWith("/settings") && (
        <button
          className="mb-1 flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {t("back")}
        </button>
      )}

      <nav
        className="mb-4 flex flex-col gap-0.5 lg:mb-0"
        aria-label="Sidebar navigation"
      >
        {visibleItems.map((item: SidebarNavItem, index) => {
          const Icon = item.icon
            ? (Icons[item.icon as keyof typeof Icons] as LucideIcon)
            : null;

          const sectionKey = `${item.title}-${index}`;
          const isLocked = isItemLocked(item);
          const filteredChildItems = filterItems(item.items || []);
          const isOpen =
            openSections[sectionKey] ??
            (isAnyChildActive(filteredChildItems) ||
              (item.href && isParentActive(item.href)));

          // ── Collapsible parent ──────────────────────────────────────────
          if (filteredChildItems.length > 0) {
            const parentActive =
              isAnyChildActive(filteredChildItems) ||
              (!hasExactChildMatch(filteredChildItems) &&
                item.href &&
                isItemActive(item.href));

            return (
              <Collapsible
                key={index}
                open={!!isOpen}
                onOpenChange={() => toggleSection(sectionKey)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CollapsibleTrigger asChild>
                      <button
                        disabled={item.disabled || isLocked}
                        className={cn(
                          "group relative flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium",
                          "transition-all duration-150",
                          "hover:bg-accent",
                          parentActive
                            ? "bg-cyan-400/10 text-foreground"
                            : "text-muted-foreground",
                          (item.disabled || isLocked) && "cursor-not-allowed opacity-60",
                        )}
                      >
                        {/* Active left indicator */}
                        {parentActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-cyan-400" />
                        )}

                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                              parentActive
                                ? "bg-cyan-400/20 text-cyan-400"
                                : "bg-muted/60 text-muted-foreground group-hover:bg-muted",
                              isLocked && "opacity-60",
                            )}
                          >
                            {isLocked
                              ? <Lock className="h-3.5 w-3.5" />
                              : Icon
                                ? <Icon className="h-3.5 w-3.5" />
                                : null}
                          </span>
                          <span className="truncate capitalize">{t(item.title)}</span>
                        </div>

                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                            isOpen && "rotate-90",
                            isLocked && "opacity-40",
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                  </TooltipTrigger>
                  {isLocked && (
                    <TooltipContent side="right">
                      <p>You don't have permission to access this section</p>
                    </TooltipContent>
                  )}
                </Tooltip>

                <CollapsibleContent className="overflow-hidden">
                  <div className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-border/50 pl-3 pb-1">
                    {filteredChildItems.map((subItem, subIndex) => {
                      const SubIcon = subItem.icon
                        ? (Icons[subItem.icon as keyof typeof Icons] as LucideIcon)
                        : null;
                      const isSubItemLocked = isItemLocked(subItem);
                      const subActive = subItem.href && isItemActive(subItem.href) && !isSubItemLocked;

                      return (
                        <Tooltip key={subIndex}>
                          <TooltipTrigger asChild>
                            <Link
                              href={subItem.disabled || isSubItemLocked ? "#" : subItem.href}
                              aria-current={subActive ? "page" : undefined}
                              className={cn(
                                "relative flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium",
                                "transition-all duration-150 hover:bg-accent min-h-[36px]",
                                subActive
                                  ? "bg-cyan-400/10 text-foreground"
                                  : "text-muted-foreground",
                                (subItem.disabled || isSubItemLocked) && "cursor-not-allowed opacity-60",
                              )}
                              onClick={(e) => {
                                if (subItem.disabled || isSubItemLocked) e.preventDefault();
                              }}
                            >
                              {subActive && (
                                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-cyan-400" />
                              )}
                              {isSubItemLocked
                                ? <Lock className="h-3.5 w-3.5 shrink-0" />
                                : SubIcon
                                  ? <SubIcon className={cn("h-3.5 w-3.5 shrink-0", subActive && "text-cyan-400")} />
                                  : null}
                              <span className="truncate capitalize">{tSubItem(subItem.title)}</span>
                            </Link>
                          </TooltipTrigger>
                          {isSubItemLocked && (
                            <TooltipContent side="right">
                              <p>You don't have permission to access this page</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          }

          // ── Regular item ───────────────────────────────────────────────
          if (!item.href) return null;

          const active = isItemActive(item.href) && !isLocked;

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Link
                  id={item.id}
                  href={item.disabled || isLocked ? "#" : item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                    "transition-all duration-150 hover:bg-accent min-h-[44px]",
                    active
                      ? "bg-cyan-400/10 text-foreground"
                      : "text-muted-foreground",
                    (item.disabled || isLocked) && "cursor-not-allowed opacity-60",
                  )}
                  onClick={(e) => {
                    if (item.disabled || isLocked) e.preventDefault();
                  }}
                >
                  {/* Active left indicator */}
                  {active && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                  )}

                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                      active
                        ? "bg-cyan-400/20 text-cyan-400"
                        : "bg-muted/60 text-muted-foreground group-hover:bg-muted",
                      isLocked && "opacity-60",
                    )}
                  >
                    {isLocked
                      ? <Lock className="h-3.5 w-3.5" />
                      : Icon
                        ? <Icon className="h-3.5 w-3.5" />
                        : null}
                  </span>

                  <span className="truncate capitalize">{t(item.title)}</span>
                </Link>
              </TooltipTrigger>
              {isLocked && (
                <TooltipContent side="right">
                  <p>You don't have permission to access this page</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
