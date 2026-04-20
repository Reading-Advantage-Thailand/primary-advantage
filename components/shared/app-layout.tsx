import Leaderboard from "@/components/leaderboard";
import { MainNav } from "@/components/nav/main-nav";
import { MobileBottomNav } from "@/components/nav/mobile-bottom-nav";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { UserAccountNav } from "@/components/nav/user-account-nav";
import ProgressBar from "@/components/progress-bar-xp";
import { StickyHeader } from "@/components/shared/sticky-header";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import { ThemeToggle } from "@/components/switchers/theme-switcher-toggle";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { MainNavItem, SidebarNavItem } from "@/types";
import { Role } from "@/types/enum";
import { getLocale } from "next-intl/server";

interface AppLayoutProps {
  children?: React.ReactNode;
  mainNavConfig: MainNavItem[];
  sidebarNavConfig?: SidebarNavItem[];
  disableProgressBar?: boolean;
  disableSidebar?: boolean;
  disableLeaderboard?: boolean;
}

export interface BaseAppLayoutProps {
  children?: React.ReactNode;
}

export default async function AppLayout({
  children,
  mainNavConfig,
  sidebarNavConfig,
  disableProgressBar,
  disableSidebar = false,
  disableLeaderboard = false,
}: AppLayoutProps) {
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Redirect to sign in page if user is not logged in
  if (!user) {
    return redirect({ href: "/auth/signin", locale });
  }

  let leaderboardData: any | null = null;

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <StickyHeader>
        <div className="container flex h-16 items-center justify-between">
          <MainNav
            items={mainNavConfig}
            overflowItems={sidebarNavConfig?.slice(4)}
            user={user}
          />
          {!disableProgressBar && user?.role === Role.student && (
            <ProgressBar currentXP={user.xp!} currentLevel={user.level!} />
          )}
          <div className="flex items-center justify-center gap-2">
            <OfflineIndicator />
            <InstallPrompt />
            <LocaleSwitcher />
            <ThemeToggle />
            <UserAccountNav user={user} />
          </div>
        </div>
      </StickyHeader>
      <div
        className={cn(
          "container",
          disableSidebar
            ? "flex flex-1 gap-12"
            : "flex flex-1 flex-col gap-4 md:flex-row",
        )}
      >
        {!disableSidebar && (
          <aside className="hidden md:flex md:flex-col md:w-44 lg:w-52 shrink-0">
            <SidebarNav items={sidebarNavConfig || []} user={user} />
            {!disableLeaderboard && user?.role === Role.student ? (
              <Leaderboard
                data={leaderboardData?.results || []}
                schoolName={leaderboardData?.schoolName || ""}
                userId={user?.id || ""}
              />
            ) : null}
          </aside>
        )}
        <main className="flex w-full flex-1 flex-col overflow-hidden pb-16 md:pb-0">
          {children}
        </main>
      </div>
      {!disableSidebar && sidebarNavConfig?.length && (
        <MobileBottomNav items={sidebarNavConfig} user={user} />
      )}
    </div>
  );
}
