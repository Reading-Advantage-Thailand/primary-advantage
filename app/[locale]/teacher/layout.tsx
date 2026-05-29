import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { teacherPageConfig } from "@/configs/teacher-page-config";

/**
 * Renders the teacher layout wrapper with app navigation and sidebar configuration.
 * Disables the leaderboard for teacher pages.
 */
export default async function TeacherHomeLayout({
  children,
}: BaseAppLayoutProps) {
  return (
    <AppLayout
      mainNavConfig={teacherPageConfig.mainNav}
      sidebarNavConfig={teacherPageConfig.sidebarNav}
      disableLeaderboard
    >
      {children}
    </AppLayout>
  );
}
