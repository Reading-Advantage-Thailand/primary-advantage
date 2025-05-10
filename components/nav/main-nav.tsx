"use client";

import Link from "next/link";
import React from "react";
import { MainNavItem } from "@/types";
import { cn } from "@/lib/utils";
import { useSelectedLayoutSegment } from "next/navigation";
import { MobileNav } from "./mobile-nav";
import { Icons } from "../icons";
import { X } from "lucide-react";
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
    <div className="flex md:gap-10 gap-6">
      <Link href="/" className="hidden items-center space-x-2 md:flex">
        {/* <Icons.logo /> */}
        <span className="hidden text-[#3b82f6] font-heading font-bold sm:inline-block">
          {siteConfig.name}
        </span>
      </Link>
      {items?.length ? (
        <nav className="hidden gap-6 md:flex">
          {items?.map((item, index) => (
            <Link
              key={index}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "font-menu capitalize flex items-center text-xl font-medium transition-colors hover:text-foreground/80",
                item.href.startsWith(`/${segment}`)
                  ? "text-foreground"
                  : "text-foreground/60",
                item.disabled && "cursor-not-allowed opacity-80"
              )}
            >
              {t(item.title)}
            </Link>
          ))}
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
