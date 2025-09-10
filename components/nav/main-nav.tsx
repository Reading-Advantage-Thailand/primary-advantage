"use client";

import Link from "next/link";
import React from "react";
import { MainNavItem } from "@/types";
import { cn } from "@/lib/utils";
import { useSelectedLayoutSegment } from "next/navigation";
import { Icons } from "../icons";
import { MobileNav } from "./mobile-nav";
import * as IconsLucide from "lucide-react";
import { LucideIcon, X } from "lucide-react";
import { siteConfig } from "@/configs/site-config";
import { useTranslations } from "next-intl";

interface MainNavProps {
  children?: React.ReactNode;
  items?: MainNavItem[];
}

export function MainNav({ children, items }: MainNavProps) {
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const segment = useSelectedLayoutSegment();
  const t = useTranslations("MainNav");

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="hidden items-center space-x-2 md:flex">
        <Icons.logo />
        <span className="font-logo hidden font-bold text-[#22d3ee] sm:inline-block">
          {siteConfig.name}
        </span>
      </Link>
      {items?.length ? (
        <nav className="hidden gap-6 md:flex">
          {items?.map((item, index) => {
            const Icon = item.icon
              ? (IconsLucide[
                  item.icon as keyof typeof IconsLucide
                ] as LucideIcon)
              : null;

            return (
              <Link
                key={index}
                href={item.disabled ? "#" : item.href}
                className={cn(
                  "font-menu hover:text-foreground/80 flex items-center text-lg font-medium capitalize transition-colors",
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
      <button
        className="flex items-center space-x-2 md:hidden"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        {showMobileMenu ? <X color="#3b82f6" /> : <Icons.logo />}
        <span className="font-bold text-[#3b82f6]">menu</span>
      </button>
      {showMobileMenu && items && (
        <MobileNav items={items}>{children}</MobileNav>
      )}
    </div>
  );
}
