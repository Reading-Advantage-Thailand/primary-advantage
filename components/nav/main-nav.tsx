"use client";

import { Link } from "@/i18n/navigation";
import { MainNavItem, SidebarNavItem } from "@/types";
import { cn } from "@/lib/utils";
import { useSelectedLayoutSegment } from "next/navigation";
import { Icons } from "../icons";
import { MobileNav } from "./mobile-nav";
import { useMobileNavStore } from "@/store/useMobileNavStore";
import * as IconsLucide from "lucide-react";
import { LucideIcon, MenuIcon, X } from "lucide-react";
import { siteConfig } from "@/configs/site-config";
import { useTranslations } from "next-intl";
import { UserForPermissions } from "@/lib/permissions";

interface MainNavProps {
  items?: MainNavItem[];
  overflowItems?: SidebarNavItem[];
  user?: UserForPermissions | null;
}

export function MainNav({ items, overflowItems, user }: MainNavProps) {
  const { isOpen, toggle } = useMobileNavStore();
  const segment = useSelectedLayoutSegment();
  const t = useTranslations("MainNav");

  return (
    <div className="flex items-center md:gap-10">
      {/* Logo — always visible on all platforms */}
      <Link href="/" className="flex items-center gap-2">
        <Icons.logo/>
        <span className="font-logo hidden font-bold text-[#22d3ee] sm:inline-block md:text-xs lg:text-lg">
          {siteConfig.name}
        </span>
      </Link>

      {/* Desktop nav links */}
      {items?.length ? (
        <nav className="hidden gap-4 md:flex" aria-label="Main navigation">
          {items.map((item, index) => {
            const Icon = item.icon
              ? (IconsLucide[item.icon as keyof typeof IconsLucide] as LucideIcon)
              : null;

            return (
              <Link
                key={index}
                href={item.disabled ? "#" : item.href}
                className={cn(
                  "font-menu hover:text-foreground/80 flex items-center font-medium capitalize transition-colors md:text-xs lg:text-lg",
                  item.href.startsWith(`/${segment}`)
                    ? "text-foreground"
                    : "text-foreground/60",
                  item.disabled && "cursor-not-allowed opacity-80",
                )}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                {t(item.title)}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {/* Mobile hamburger — clean icon-only button */}
      <button
        className="flex h-9 w-9 mr-2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        onClick={toggle}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
      >
        {isOpen
          ? <X className="h-5 w-5 text-cyan-500" />
          : <MenuIcon className="h-5 w-5 text-cyan-500" />
        }
      </button>

      {/* Right-side drawer — always mounted for AnimatePresence exit animations */}
      <MobileNav
        mainNavItems={items}
        overflowItems={overflowItems}
        user={user}
      />
    </div>
  );
}
