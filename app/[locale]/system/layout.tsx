import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { systemPageConfig } from "@/configs/system-page-config";

/**
 * Renders the system section layout wrapping child pages with the app layout, main nav, and sidebar navigation.
 */
export default async function SystemHomeLayout({
  children,
}: BaseAppLayoutProps) {
  return (
    <AppLayout
      mainNavConfig={systemPageConfig.mainNav}
      sidebarNavConfig={systemPageConfig.sidebarNav}
      disableLeaderboard
    >
      {children}
    </AppLayout>
  );
}
