"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchStudentGoalsApi } from "@/utils/api-request";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Goal {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  targetDate: Date;
  status: string;
  priority: string;
}

export function ActiveGoalsWidget() {
  const t = useTranslations("Student.Dashboard.activeGoals");
  const tc = useTranslations("Components.activeGoalsWidget");
  const router = useRouter();
  const { user } = useCurrentUser();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["student-active-goals", user?.id],
    queryFn: () => fetchStudentGoalsApi(),
  });

  const filteredGoals = React.useMemo(() => {
    return data?.goals.filter((goal: Goal) => goal.status === "ACTIVE") || [];
  }, [data]);

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {tc("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">{tc("loading")}</div>
        </CardContent>
      </Card>
    );
  }

  if (filteredGoals?.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {tc("title")}
          </CardTitle>
          <CardDescription>{tc("emptyDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => router.push("/student/goals")}
            className="w-full"
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            {tc("createFirst")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {tc("title")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/student/goals")}
          >
            View All
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <CardDescription>{tc("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredGoals.slice(0, 3)?.map((goal: any) => {
            const progressPercentage = Math.min(
              (goal.currentValue / goal.targetValue) * 100,
              100,
            );

            const daysRemaining = Math.ceil(
              (new Date(goal.targetDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            );

            return (
              <div
                key={goal.id}
                className="hover:bg-accent cursor-pointer rounded-lg border p-3 transition-colors"
                onClick={() => router.push("/student/goals")}
              >
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="text-sm font-medium">{goal.title}</h4>
                  {goal.priority === "HIGH" && (
                    <Badge variant="destructive" className="text-xs">
                      {tc("highPriority")}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>
                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                    </span>
                    <span>{progressPercentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {daysRemaining > 0
                        ? tc("daysLeft", { count: daysRemaining })
                        : daysRemaining === 0
                          ? tc("dueToday")
                          : tc("overdue")}
                    </span>
                    {progressPercentage >= 50 && (
                      <span className="flex items-center text-green-600">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        {tc("onTrack")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
