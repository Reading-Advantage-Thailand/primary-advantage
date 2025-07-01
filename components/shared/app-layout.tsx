import { MainNav } from "@/components/nav/main-nav";
import { UserAccountNav } from "@/components/nav/user-account-nav";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import ProgressBar from "@/components/progress-bar-xp";
import { MainNavItem, SidebarNavItem } from "@/types";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/switchers/theme-switcher-toggle";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

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
  disableSidebar,
  disableLeaderboard,
}: AppLayoutProps) {
  const session = await auth();
  //   const user = await getCurrentUser();

  // Redirect to sign in page if user is not logged in
  if (!session) {
    return redirect("/auth/signin");
  }

  //   const feactlearderboard = async () => {
  //     if (!user.license_id) return [];
  //     const res = await fetch(
  //       `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/ranking/${user.license_id}`,
  //       { method: "GET", headers: headers() }
  //     );
  //     if (!res.ok) throw new Error("Failed to fetch LeaderBoard list");
  //     const fetchdata = await res.json();
  //     return fetchdata.results;
  //   };

  //   const leaderboard = await feactlearderboard();

  // Redirect to level selection page if user has not selected a level
  // if (user.level === undefined || user.cefr_level === "") {
  //   return redirect("/level");
  // }

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <MainNav items={mainNavConfig} />
          {/* {!disableProgressBar && (
            <ProgressBar
              progress={session.user.xp}
              level={session.user.level!}
            />
          )} */}
          <div className="flex justify-center items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
            <UserAccountNav user={session?.user} />
          </div>
        </div>
      </header>
      <div
        className={cn(
          "container",
          disableSidebar
            ? "grid flex-1 gap-12"
            : "mx-auto px-4 lg:grid lg:flex-1 gap-12 lg:grid-cols-[200px_1fr]"
        )}
      >
        {!disableSidebar && (
          <aside className="lg:w-[230px] lg:flex-col lg:flex">
            <SidebarNav items={sidebarNavConfig || []} />
            {/* {user.license_id && !disableLeaderboard ? (
              <Leaderboard data={leaderboard} />
            ) : null} */}
          </aside>
        )}
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
