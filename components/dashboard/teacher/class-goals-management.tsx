"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Target } from "lucide-react";
import { ClassroomGoalGroupCard } from "./class-goal-group-card";
import { CreateClassroomGoalDialog } from "./create-classroom-goal-dialog";
import { StudentProgressDialog } from "./student-progress-dialog";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { fetchTeacherClassGoalsApi } from "@/utils/api-request";
import { useQuery } from "@tanstack/react-query";

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

export function ClassroomGoalsManagement() {
  const tGoals = useTranslations(
    "Teacher.Dashboard.classDetail.goals.management",
  );
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showProgressDialog, setShowProgressDialog] = React.useState(false);
  const [selectedGoal, setSelectedGoal] = React.useState<GroupedGoal | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [studentCount, setStudentCount] = React.useState(0);
  const params = useParams();
  const classroomId = params.classroomId as string;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["teacher-class-goals", classroomId],
    queryFn: () => fetchTeacherClassGoalsApi(classroomId),
  });

  const handleViewDetails = (goal: GroupedGoal) => {
    setSelectedGoal(goal);
    setShowProgressDialog(true);
  };

  // Filter logic
  const filteredData = React.useMemo(() => {
    if (!data?.data || !Array.isArray(data.data)) {
      return [];
    }
    let filtered = [...data.data];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (goal) =>
          goal.goalInfo.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          goal.goalInfo.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      if (filterStatus === "COMPLETED") {
        filtered = filtered.filter(
          (goal) => goal.completedCount === goal.totalStudents,
        );
      } else if (filterStatus === "ACTIVE") {
        filtered = filtered.filter((goal) => goal.activeCount > 0);
      }
    }

    return filtered;
  }, [data, searchQuery, filterStatus]);

  const totalGoals = data?.data?.length || 0;
  const fullyCompletedGoals =
    data?.data?.filter((g: any) => g.completedCount === g.totalStudents)
      .length || 0;
  const activeGoals =
    data?.data?.filter((g: any) => g.activeCount > 0).length || 0;
  if (isPending) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading goals...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {tGoals("totalGoals")}
              </CardTitle>
              <Target className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGoals}</div>
              <p className="text-muted-foreground text-xs">
                For {studentCount} students
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {tGoals("activeGoals")}
              </CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeGoals}</div>
              <p className="text-muted-foreground text-xs">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {tGoals("fullyCompleted")}
              </CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fullyCompletedGoals}</div>
              <p className="text-muted-foreground text-xs">
                {tGoals("allStudentsFinished")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tGoals("title")}</CardTitle>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {tGoals("addGoalButton")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder={tGoals("searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder={tGoals("filterAllStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {tGoals("filterAllGoals")}
                  </SelectItem>
                  <SelectItem value="ACTIVE">
                    {tGoals("filterActive")}
                  </SelectItem>
                  <SelectItem value="COMPLETED">
                    {tGoals("filterFullyCompleted")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Goals List */}
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">
                  {tGoals("noGoalsFound")}
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  {totalGoals === 0
                    ? tGoals("noGoalsDescription")
                    : tGoals("noMatchingGoals")}
                </p>
                {totalGoals === 0 && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {tGoals("createFirstGoal")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredData.map((goal) => (
                  <ClassroomGoalGroupCard
                    key={goal.goalInfo.id}
                    goal={goal}
                    classroomId={classroomId}
                    onViewDetails={() => handleViewDetails(goal)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Goal Dialog */}
      <CreateClassroomGoalDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        classroomId={classroomId}
        className={data.classRoomName}
      />

      {/* Student Progress Dialog */}
      <StudentProgressDialog
        open={showProgressDialog}
        onClose={() => {
          setShowProgressDialog(false);
          setSelectedGoal(null);
        }}
        goal={selectedGoal}
      />
    </>
  );
}
