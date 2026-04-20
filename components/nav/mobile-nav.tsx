"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Link, usePathname } from "@/i18n/navigation";
import { MainNavItem, SidebarNavItem } from "@/types";
import { useMobileNavStore } from "@/store/useMobileNavStore";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/configs/site-config";
import { hasAnyPermission, UserForPermissions } from "@/lib/permissions";
import { Icons } from "@/components/icons";
import * as LucideIcons from "lucide-react";
import { ChevronRight, LucideIcon, Lock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface MobileNavProps {
  mainNavItems?: MainNavItem[];
  overflowItems?: SidebarNavItem[];
  user?: UserForPermissions | null;
}

export function MobileNav({ mainNavItems, overflowItems, user }: MobileNavProps) {
  const { isOpen, close } = useMobileNavStore();
  const path = usePathname();
  const t = useTranslations("MainNav");
  const tSidebar = useTranslations("Sidebar");
  const [mounted, setMounted] = useState(false);
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Auto-expand parents whose child is active
  useEffect(() => {
    if (!overflowItems) return;
    const initial: Record<number, boolean> = {};
    overflowItems.forEach((item, i) => {
      if (item.items?.some((sub) => path === sub.href || path.startsWith(sub.href + "/"))) {
        initial[i] = true;
      }
    });
    setOpenSections(initial);
  }, [path, overflowItems]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Focus close button when drawer opens
  useEffect(() => {
    if (isOpen) setTimeout(() => closeButtonRef.current?.focus(), 50);
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  // Close on route change
  useEffect(() => { close(); }, [path, close]);

  const hasItemPermission = (item: SidebarNavItem | any) => {
    if (!item.requiredPermissions?.length) return true;
    return hasAnyPermission(user, item.requiredPermissions);
  };

  const visibleOverflow = overflowItems?.filter(
    (item) => !(item.hideWhenNoPermission && !hasItemPermission(item)),
  );

  const isSidebarItemActive = (item: SidebarNavItem): boolean => {
    const href = item.href;
    if (href) return path === href || path.startsWith(href + "/");
    if (item.items) return item.items.some((sub) => path === sub.href || path.startsWith(sub.href + "/"));
    return false;
  };

  const isChildActive = (href: string) =>
    path === href || path.startsWith(href + "/");

  const toggleSection = (index: number) =>
    setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-60 bg-black/40 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            id="mobile-nav-drawer"
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={cn(
              "md:hidden fixed inset-y-0 right-0 z-60 w-72",
              "flex flex-col",
              "bg-background border-l border-border shadow-2xl",
            )}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <Link href="/" onClick={close} className="flex items-center gap-2">
                <Icons.logo />
                <span className="font-logo font-bold text-[#22d3ee] text-sm">
                  {siteConfig.name}
                </span>
              </Link>
              <button
                ref={closeButtonRef}
                onClick={close}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto py-3">

              {/* Overflow sidebar items */}
              {visibleOverflow && visibleOverflow.length > 0 && (
                <section className="mb-2">
                  <p className="px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    More
                  </p>
                  {visibleOverflow.map((item, index) => {
                    const active = isSidebarItemActive(item);
                    const isLocked = !hasItemPermission(item);
                    const Icon = item.icon
                      ? (LucideIcons[item.icon as keyof typeof LucideIcons] as LucideIcon)
                      : null;
                    const hasChildren = item.items && item.items.length > 0;
                    const sectionOpen = !!openSections[index];

                    // ── Parent with children → accordion ─────────────────
                    if (hasChildren) {
                      return (
                        <div key={index}>
                          <button
                            onClick={() => !isLocked && toggleSection(index)}
                            aria-expanded={sectionOpen}
                            disabled={isLocked}
                            className={cn(
                              "relative flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium capitalize",
                              "transition-colors hover:bg-accent min-h-11",
                              active ? "text-cyan-400 bg-cyan-400/5" : "text-foreground/80",
                              isLocked && "pointer-events-none opacity-50",
                            )}
                          >
                            {/* Active left indicator */}
                            {active && (
                              <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-cyan-400" />
                            )}
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                active ? "bg-cyan-400/15 text-cyan-400" : "bg-muted text-muted-foreground",
                              )}
                            >
                              {isLocked ? <Lock className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4" /> : null}
                            </span>
                            <span className="flex-1 text-left">{tSidebar(item.title)}</span>
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                sectionOpen && "rotate-90",
                              )}
                            />
                          </button>

                          {/* Animated children */}
                          <AnimatePresence initial={false}>
                            {sectionOpen && (
                              <motion.div
                                key="children"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="ml-13 flex flex-col gap-0.5 border-l border-border/50 pl-3 pb-1">
                                  {item.items!.map((subItem, subIndex) => {
                                    const subLocked = !hasItemPermission(subItem);
                                    const subActive = isChildActive(subItem.href) && !subLocked;
                                    const SubIcon = subItem.icon
                                      ? (LucideIcons[subItem.icon as keyof typeof LucideIcons] as LucideIcon)
                                      : null;

                                    return (
                                      <Link
                                        key={subIndex}
                                        href={subItem.disabled || subLocked ? "#" : subItem.href}
                                        aria-current={subActive ? "page" : undefined}
                                        className={cn(
                                          "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium capitalize",
                                          "transition-colors hover:bg-accent min-h-10",
                                          subActive
                                            ? "text-cyan-400 bg-cyan-400/5"
                                            : "text-muted-foreground",
                                          (subItem.disabled || subLocked) && "pointer-events-none opacity-50",
                                        )}
                                        onClick={(e) => {
                                          if (subItem.disabled || subLocked) e.preventDefault();
                                        }}
                                      >
                                        {subLocked
                                          ? <Lock className="h-3.5 w-3.5 shrink-0" />
                                          : SubIcon
                                            ? <SubIcon className={cn("h-3.5 w-3.5 shrink-0", subActive && "text-cyan-400")} />
                                            : null}
                                        {tSidebar(subItem.title)}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    // ── Regular item (no children) ────────────────────────
                    return (
                      <Link
                        key={index}
                        href={item.disabled || isLocked ? "#" : (item.href ?? "#")}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium capitalize",
                          "transition-colors hover:bg-accent min-h-11",
                          active ? "text-cyan-400 bg-cyan-400/5" : "text-foreground/80",
                          (item.disabled || isLocked) && "pointer-events-none opacity-50",
                        )}
                        onClick={(e) => {
                          if (item.disabled || isLocked) e.preventDefault();
                        }}
                      >
                        {active && (
                          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-cyan-400" />
                        )}
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            active ? "bg-cyan-400/15 text-cyan-400" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {isLocked ? <Lock className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4" /> : null}
                        </span>
                        {tSidebar(item.title)}
                      </Link>
                    );
                  })}
                </section>
              )}

              {/* Divider */}
              {visibleOverflow && visibleOverflow.length > 0 && mainNavItems?.length && (
                <div className="my-2 border-t border-border/60" />
              )}

              {/* Main nav items */}
              {mainNavItems && mainNavItems.length > 0 && (
                <section>
                  <p className="px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Navigation
                  </p>
                  {mainNavItems.map((item, index) => {
                    const Icon = item.icon
                      ? (LucideIcons[item.icon as keyof typeof LucideIcons] as LucideIcon)
                      : null;
                    const isActive = path === item.href;

                    return (
                      <Link
                        key={index}
                        href={item.disabled ? "#" : item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium capitalize",
                          "transition-colors hover:bg-accent min-h-11",
                          isActive ? "text-cyan-400 bg-cyan-400/5" : "text-foreground/80",
                          item.disabled && "pointer-events-none opacity-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            isActive ? "bg-cyan-400/15 text-cyan-400" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                        </span>
                        {t(item.title)}
                      </Link>
                    );
                  })}
                </section>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
