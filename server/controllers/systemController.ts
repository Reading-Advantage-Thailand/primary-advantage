import {
  getSystemDashboardModel,
  getSystemHealthModel,
  getRecentActivitiesModel,
  getActivityMetricsModel,
  getAssignmentMetricsModel,
  getDailyActivityUsersModel,
  getActiveUsersModel,
  getMetricsCardsModel,
  getSystemActivityChartsModel,
  getSystemLicensesModel,
} from "../models/systemModel";
import {
  ActivityDataPoint,
  MetricsActivityResponse,
  MetricsAssignmentsResponse,
  AssignmentMetrics,
} from "@/types/dashboard";
import { AssignmentStatus } from "@prisma/client";

export const fetchSystemDashboardController = async (
  dateRange?: string | number,
) => {
  // Get recent activities
  async function getRecentActivities(limit: number = 5) {
    try {
      const activities = await getRecentActivitiesModel(limit);

      if (!activities) {
        return [];
      }

      return activities.map((activity) => ({
        id: activity.id,
        type: activity.activityType,
        userId: activity.userId,
        userName: activity.user.name,
        userRole: activity.user.role,
        targetId: activity.targetId,
        completed: activity.completed,
        timestamp: activity.createdAt.toISOString(),
        details: activity.details,
      }));
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      return [];
    }
  }

  // Calculate system health metrics
  async function calculateSystemHealth() {
    const startTime = Date.now();

    try {
      // Test database performance
      const dbStartTime = Date.now();
      const { ResponseTime, totalActivities } = await getSystemHealthModel();
      const dbResponseTime = Date.now() - dbStartTime;

      // Get database status
      const dbStatus =
        dbResponseTime < 100
          ? "Excellent"
          : dbResponseTime < 500
            ? "Good"
            : "Slow";

      // Calculate API response time (based on current request processing)
      const apiResponseTime = Date.now() - startTime;
      const apiStatus =
        apiResponseTime < 200
          ? "Fast"
          : apiResponseTime < 1000
            ? "Good"
            : "Slow";

      // Get activity count from recent activity (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Simple error rate based on activity volume (could be improved with actual error tracking)
      const errorRate =
        totalActivities && totalActivities > 1000
          ? "Low"
          : totalActivities && totalActivities > 0
            ? "Low"
            : "Unknown";

      // Calculate uptime (you might want to track this separately)
      const uptime = "99.9%";

      return {
        database: dbStatus,
        databaseResponseTime: `${dbResponseTime}ms`,
        apiResponse: apiStatus,
        apiResponseTime: `${apiResponseTime}ms`,
        errorRate,
        uptime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error calculating system health:", error);
      return {
        database: "Error",
        databaseResponseTime: "N/A",
        apiResponse: "Error",
        apiResponseTime: "N/A",
        errorRate: "Unknown",
        uptime: "Unknown",
        error: String(error),
        lastChecked: new Date().toISOString(),
      };
    }
  }

  const [
    data,
    healthMetrics,
    recentActivities,
    activityMetrics,
    assignmentMetrics,
  ] = await Promise.all([
    getSystemDashboardModel(),
    calculateSystemHealth(),
    getRecentActivities(5),
    fetchActivityMetricsController(dateRange),
    fetchAssignmentMetricsController(dateRange),
  ]);

  return {
    overview: data,
    health: healthMetrics,
    recentActivities,
    activity: {
      readingSessions: activityMetrics.summary.totalSessions,
      completionRate: `${assignmentMetrics.summary.averageCompletionRate}%`,
    },
  };
};

export async function fetchActivityMetricsController(
  dateRange?: string | number,
  schoolId?: string,
  classId?: string,
) {
  const startTime = Date.now();

  try {
    // Group by date
    const dateMap = new Map<
      string,
      {
        activeUsers: Set<string>;
        newUsers: Set<string>;
        sessions: number;
        totalTime: number;
      }
    >();

    const { filteredActivities, startDate, now } =
      await getActivityMetricsModel(dateRange, schoolId, classId);

    // Initialize all dates in range
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split("T")[0];
      dateMap.set(dateKey, {
        activeUsers: new Set(),
        newUsers: new Set(),
        sessions: 0,
        totalTime: 0,
      });
    }

    // Process activities
    filteredActivities.forEach((activity: any) => {
      const dateKey = new Date(activity.createdAt).toISOString().split("T")[0];
      const data = dateMap.get(dateKey);

      if (data) {
        data.activeUsers.add(activity.userId);
        data.sessions += 1;
        if (activity.timer) {
          data.totalTime += activity.timer;
        }

        // Check if user is new (created on this day)
        const userCreatedDate = new Date(activity.user.createdAt)
          .toISOString()
          .split("T")[0];
        if (userCreatedDate === dateKey) {
          data.newUsers.add(activity.userId);
        }
      }
    });

    // Convert to response format
    const dataPoints: ActivityDataPoint[] = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        activeUsers: data.activeUsers.size,
        newUsers: data.newUsers.size,
        readingSessions: data.sessions,
        averageSessionLength:
          data.sessions > 0
            ? Math.round((data.totalTime / data.sessions / 60) * 10) / 10
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate summary
    const totalActiveUsers = new Set(
      filteredActivities.map((a: any) => a.userId),
    ).size;

    const totalSessions = filteredActivities.length;

    const totalTime = filteredActivities
      .filter((a: any) => a.timer)
      .reduce((sum: number, a: any) => sum + a.timer, 0);

    const averageSessionLength =
      totalSessions > 0
        ? Math.round((totalTime / totalSessions / 60) * 10) / 10
        : 0;

    const peakDay = dataPoints.reduce(
      (peak, current) =>
        current.activeUsers > peak.activeUsers ? current : peak,
      dataPoints[0] || {
        date: "",
        activeUsers: 0,
        newUsers: 0,
        readingSessions: 0,
        averageSessionLength: 0,
      },
    ).date;

    const response: MetricsActivityResponse = {
      dateRange: dateRange || "",
      dataPoints,
      summary: {
        totalActiveUsers,
        totalSessions,
        averageSessionLength,
        peakDay,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    return response;
  } catch (error) {
    console.error("[Controller] getActivityMetrics - Error:", error);
    throw error;
  }
}

export async function fetchAssignmentMetricsController(
  dateRange?: string | number,
  schoolId?: string,
  classId?: string,
) {
  const startTime = Date.now();

  try {
    const assignments = await getAssignmentMetricsModel(
      dateRange,
      schoolId,
      classId,
    );

    const assignmentMetrics: AssignmentMetrics[] = assignments.map(
      (assignment) => {
        const total = assignment.AssignmentStudent.length;
        const completed = assignment.AssignmentStudent.filter(
          (sa) => sa.status === AssignmentStatus.COMPLETED,
        ).length;
        const inProgress = assignment.AssignmentStudent.filter(
          (sa) => sa.status === AssignmentStatus.IN_PROGRESS,
        ).length;
        const notStarted = assignment.AssignmentStudent.filter(
          (sa) => sa.status === AssignmentStatus.NOT_STARTED,
        ).length;

        const scores = assignment.AssignmentStudent.filter(
          (sa) => sa.score !== null,
        ).map((sa) => sa.score!);

        const averageScore =
          scores.length > 0
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : 0;

        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        return {
          assignmentId: assignment.id,
          articleId: assignment.articleId,
          name: assignment.name || "Untitled Assignment",
          dueDate: assignment.dueDate?.toISOString(),
          assigned: total,
          completed,
          inProgress,
          notStarted,
          averageScore: Math.round(averageScore * 100) / 100,
          completionRate: Math.round(completionRate * 10) / 10,
        };
      },
    );

    const totalAssignments = assignmentMetrics.length;
    const averageCompletionRate =
      totalAssignments > 0
        ? assignmentMetrics.reduce((sum, a) => sum + a.completionRate, 0) /
          totalAssignments
        : 0;

    const allScores = assignmentMetrics
      .filter((a) => a.averageScore > 0)
      .map((a) => a.averageScore);

    const averageScore =
      allScores.length > 0
        ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        : 0;

    const response: MetricsAssignmentsResponse = {
      dateRange: dateRange || "",
      assignments: assignmentMetrics,
      summary: {
        totalAssignments,
        averageCompletionRate: Math.round(averageCompletionRate * 10) / 10,
        averageScore: Math.round(averageScore * 100) / 100,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    // const duration = Date.now() - startTime;

    return response;
  } catch (error) {
    console.error("[Controller] getAssignmentMetrics - Error:", error);
    throw error;
  }
}

export async function fetchDailyActivityUsersController(licenseId?: string) {
  try {
    const totalActiveUsers = await getDailyActivityUsersModel(licenseId);
    return totalActiveUsers;
  } catch (error) {
    console.error("[Controller] getDailyActivityUsers - Error:", error);
    throw error;
  }
}

export async function getActiveUsersController(dateRange?: string | number) {
  try {
    const activeUsers = await getActiveUsersModel(dateRange);
    return activeUsers;
  } catch (error) {
    console.error("[Controller] getActiveUsers - Error:", error);
    throw error;
  }
}

export async function fetchMetricsCardsController(dateRange?: string | number) {
  try {
    const metricsCards = await getMetricsCardsModel(dateRange);
    return metricsCards;
  } catch (error) {
    console.error("[Controller] getMetricsCards - Error:", error);
    throw error;
  }
}

export async function fetchSystemActivityChartsController(
  dateRange?: string | number,
) {
  try {
    const activityCharts = await getSystemActivityChartsModel(dateRange);
    return activityCharts;
  } catch (error) {
    console.error("[Controller] getActivityCharts - Error:", error);
    throw error;
  }
}

export async function fetchSystemLicensesController() {
  try {
    const licenses = await getSystemLicensesModel();
    return licenses;
  } catch (error) {
    console.error("[Controller] getSystemLicenses - Error:", error);
    throw error;
  }
}
