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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  Calendar,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  Pause,
  Play,
  CheckCircle2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";

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

interface GoalCardProps {
  goal: Goal;
  onUpdate: () => void;
  onDelete: () => void;
}

export function GoalCard({ goal, onUpdate, onDelete }: GoalCardProps) {
  const { user } = useCurrentUser();

  const queryClient = useQueryClient();

  const deleteGoals = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/students/goals`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: goal.id,
        }),
      });

      if (!res.ok) throw new Error("Delete failed");
      // บาง API ลบแล้วไม่ return json ก็ไม่ต้อง return res.json() ก็ได้
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student-active-goals", user?.id],
      });
      onDelete();
    },
  });

  const updateGoals = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/students/goals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: goal.id,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error("Update failed");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student-active-goals", user?.id],
      });
      onUpdate();
    },
  });

  const progressPercentage = Math.min(
    (goal.currentValue / goal.targetValue) * 100,
    100,
  );

  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const handleStatusChange = async (newStatus: string) => {
    updateGoals.mutate(newStatus);
  };

  const handleDelete = async () => {
    deleteGoals.mutate();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "LOW":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "PAUSED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Target className="text-primary h-5 w-5" />
              <CardTitle>{goal.title}</CardTitle>
            </div>
            {goal.description && (
              <CardDescription>{goal.description}</CardDescription>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(goal.priority)}>
              {goal.priority}
            </Badge>
            <Badge className={getStatusColor(goal.status)}>{goal.status}</Badge>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deleteGoals.isPending || updateGoals.isPending}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {goal.status === "ACTIVE" && (
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("PAUSED")}
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Pause Goal
                  </DropdownMenuItem>
                )}
                {goal.status === "PAUSED" && (
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("ACTIVE")}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Resume Goal
                  </DropdownMenuItem>
                )}
                {goal.status === "ACTIVE" &&
                  goal.currentValue >= goal.targetValue && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("COMPLETED")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark as Complete
                    </DropdownMenuItem>
                  )}
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Progress */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {goal.currentValue} / {goal.targetValue} {goal.unit}
              </span>
              <span className="text-muted-foreground text-sm">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPercentage} />
          </div>

          {/* Time Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {daysRemaining > 0
                  ? `${daysRemaining} days remaining`
                  : daysRemaining === 0
                    ? "Due today"
                    : "Overdue"}
              </span>
            </div>

            {goal.status === "COMPLETED" && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Completed</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
