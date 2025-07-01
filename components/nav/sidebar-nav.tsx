"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "@/types";
import { ChevronLeft, LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { useTranslations } from "next-intl";

interface SidebarNavProps {
  items?: SidebarNavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const path = usePathname();
  const pathWithoutLocale = "/" + path.split("/").slice(2).join("/");
  const t = useTranslations("Sidebar");
  if (!items?.length) {
    return null;
  }
  return (
    <>
      {pathWithoutLocale.startsWith("/settings") && (
        <button
          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-500"
          onClick={() => window.history.back()}
        >
          <ChevronLeft width={16} height={16} />
          Back
        </button>
      )}
      <nav className="mb-4 flex flex-wrap items-start gap-2 lg:mb-0 lg:grid">
        {items.map((item: SidebarNavItem, index) => {
          const Icon = item.icon
            ? (Icons[item.icon as keyof typeof Icons] as LucideIcon)
            : null;
          return (
            item.href && (
              <Link
                id={item.id}
                key={index}
                href={item.disabled ? "/" : item.href}
              >
                <span
                  className={cn(
                    "group hover:bg-accent hover:text-accent-foreground flex items-center rounded-md px-3 py-2 text-sm font-medium",
                    pathWithoutLocale.startsWith(item.href)
                      ? "bg-accent"
                      : "transparent",
                    item.disabled && "cursor-not-allowed opacity-80",
                  )}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  <span
                    className={cn(
                      "truncate capitalize",
                      !pathWithoutLocale.startsWith(item.href) &&
                        "group-hover:block sm:block",
                      pathWithoutLocale.startsWith(item.href)
                        ? "text-accent-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {t(item.title)}
                  </span>
                </span>
              </Link>
            )
          );
        })}
      </nav>
    </>
  );
}
