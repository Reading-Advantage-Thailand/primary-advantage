"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Clock, XCircle, Pause } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface StudentProgress {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  studentImage: string | null;
  goalId: string;
  currentValue: number;
  status: string;
  completedAt: Date | null;
}

interface GroupedGoal {
  goalInfo: {
    id: string;
    goalType: string;
    title: string;
    description: string | null;
    targetValue: number;
    unit: string;
    targetDate: Date | string;
    priority: string;
    createdAt: Date | string;
  };
  students: StudentProgress[];
  totalStudents: number;
  completedCount: number;
  activeCount: number;
  averageProgress: number;
}

interface StudentProgressDialogProps {
  open: boolean;
  onClose: () => void;
  goal: GroupedGoal | null;
}

export function StudentProgressDialog({
  open,
  onClose,
  goal,
}: StudentProgressDialogProps) {
  const t = useTranslations(
    "Teacher.Dashboard.classDetail.goals.progressDialog",
  );
  if (!goal) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "ACTIVE":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "PAUSED":
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "ACTIVE":
        return "secondary";
      case "PAUSED":
        return "outline";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Sort students: completed first, then by progress descending
  const sortedStudents = [...goal.students].sort((a, b) => {
    if (a.status === "COMPLETED" && b.status !== "COMPLETED") return -1;
    if (a.status !== "COMPLETED" && b.status === "COMPLETED") return 1;
    return b.currentValue - a.currentValue;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{goal.goalInfo.title}</DialogTitle>
          <DialogDescription>
            {t("description", {
              targetValue: goal.goalInfo.targetValue,
              unit: goal.goalInfo.unit,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{goal.totalStudents}</div>
              <div className="text-muted-foreground text-xs">
                {t("stats.total")}
              </div>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-950">
              <div className="text-2xl font-bold text-green-600">
                {goal.completedCount}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("stats.completed")}
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-950">
              <div className="text-2xl font-bold text-blue-600">
                {goal.activeCount}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("stats.active")}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {goal.averageProgress.toFixed(0)}%
              </div>
              <div className="text-muted-foreground text-xs">
                {t("stats.avgProgress")}
              </div>
            </div>
          </div>

          {/* Student Progress Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.student")}</TableHead>
                  <TableHead className="text-center">
                    {t("table.progress")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("table.status")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("table.currentTarget")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudents.map((student) => {
                  const progressPercentage = Math.min(
                    (student.currentValue / goal.goalInfo.targetValue) * 100,
                    100,
                  );

                  return (
                    <TableRow key={student.studentId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.studentImage || ""} />
                            <AvatarFallback>
                              {(
                                student.studentName ||
                                student.studentEmail ||
                                "?"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {student.studentName || t("table.unknown")}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {student.studentEmail}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress
                            value={progressPercentage}
                            className="h-2"
                          />
                          <div className="text-muted-foreground text-center text-xs">
                            {progressPercentage.toFixed(0)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(student.status)}
                          <Badge
                            variant={getStatusBadgeVariant(student.status)}
                          >
                            {student.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono">
                          <span className="font-semibold">
                            {student.currentValue.toFixed(0)}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            / {goal.goalInfo.targetValue.toFixed(0)}{" "}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {goal.goalInfo.unit}
                          </span>
                        </div>
                        {student.completedAt && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            {t("table.completedOn", {
                              date: format(
                                new Date(student.completedAt),
                                "MMM d",
                              ),
                            })}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
