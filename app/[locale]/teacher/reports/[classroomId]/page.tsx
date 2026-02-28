import { ClassDetailDashboard } from "@/components/dashboard/teacher/class-detail-dashboard";
import { getCurrentUser } from "@/lib/session";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import {
  QueryClient,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import {
  fetchTeacherClassGoalsApi,
  fetchTeacherClassReportApi,
} from "@/utils/api-request";

export default async function ClassDetailReportsPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  const { classroomId } = await params;

  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["teacher-class-report", classroomId],
      queryFn: () => fetchTeacherClassReportApi(classroomId),
    }),
    queryClient.prefetchQuery({
      queryKey: ["teacher-class-goals", classroomId],
      queryFn: () => fetchTeacherClassGoalsApi(classroomId),
    }),
  ]);

  return (
    <div className="container mx-auto p-6">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ClassDetailDashboard />
      </HydrationBoundary>
    </div>
  );
}
