import React from "react";
import {
  QueryClient,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import GoalsPageContent from "@/components/dashboard/student/goal-page-content";
import { fetchStudentGoalsApi } from "@/utils/api-request";

export const metadata = {
  title: "Learning Goals - Reading Advantage",
  description: "Set and track your learning goals",
};

export default async function StudentGoals() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["student-goals"],
    queryFn: () => fetchStudentGoalsApi(),
  });
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Learning Goals</h1>
        <p className="text-muted-foreground mt-2">
          Set goals, track progress, and stay motivated on your learning journey
        </p>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <GoalsPageContent />
      </HydrationBoundary>
    </div>
  );
}
