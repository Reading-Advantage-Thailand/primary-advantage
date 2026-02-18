"use client";

import React, { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { GoalCard } from "./goal-card";
import { CreateGoalDialog } from "./create-goal-dialog";
import { GoalRecommendations } from "./goal-recommendations";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "@tanstack/react-query";
import { fetchStudentGoalsApi } from "@/utils/api-request";

interface Goal {
  id: string;
  goalType: string;
  title: string;
  description?: string | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: Date;
  status: string;
  priority: string;
}

interface GoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  onTrackGoals: number;
  behindScheduleGoals: number;
  completionRate: number;
}

export default function GoalsPageContent() {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [summary, setSummary] = React.useState<GoalSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | "active" | "completed">(
    "all",
  );
  const { user } = useCurrentUser();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["student-active-goals", user?.id],
    queryFn: () => fetchStudentGoalsApi(),
  });

  const filteredGoals = React.useMemo(() => {
    if (filter === "all") return data?.goals || [];
    if (filter === "active")
      return (data?.goals || []).filter((g: any) => g.status === "ACTIVE");
    if (filter === "completed")
      return (data?.goals || []).filter((g: any) => g.status === "COMPLETED");
    return data?.goals || [];
  }, [data, filter]);

  const handleGoalCreated = () => {
    setShowCreateDialog(false);
  };

  if (isPending) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Target className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalGoals}</div>
              <p className="text-muted-foreground text-xs">
                {data.activeGoals} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">On Track</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.onTrackGoals}</div>
              <p className="text-muted-foreground text-xs">
                {data.behindScheduleGoals} behind schedule
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Completion Rate
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.completionRate.toFixed(0)}%
              </div>
              <Progress value={data.completionRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            Active
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            Completed
          </Button>
        </div>

        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">No goals yet</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Create your first learning goal to start tracking your progress
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredGoals.map((goal: any) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={handleGoalCreated}
              onDelete={handleGoalCreated}
            />
          ))
        )}
      </div>

      {/* Recommendations Section */}
      {goals.length > 0 && (
        <GoalRecommendations
          userId={user?.id || ""}
          onCreateGoal={handleGoalCreated}
        />
      )}

      {/* Create Goal Dialog */}
      <CreateGoalDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        userId={user?.id || ""}
      />
    </div>
  );
}
