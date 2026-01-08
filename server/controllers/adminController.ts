import { log } from "console";
import {
  getAdminAlerts,
  getAdminDashboardModel,
  getAdoptionDataModel,
  getTeacherEffectivenessModel,
  getAdminHeatmapModel,
} from "../models/adminModel";
import { convertRaLevelToCefr } from "@/lib/utils";
import { currentUser } from "@/lib/session";

export async function fetchAdminDashboardController(
  schoolId?: string,
  dateRange?: string,
) {
  const startTime = Date.now();

  try {
    // Fetch dashboard model data
    const [
      studentsData,
      totalTeachers,
      activeStudents,
      activeTeachers,
      activeClassrooms,
      totalReadingSessions,
      averageReadingLevel,
      newUsersToday,
      activeUsersToday,
      readingSessionsToday,
      totalXp,
      userReadActivityLog,
      licensesData,
      userActivityLog,
    ] = await getAdminDashboardModel(schoolId, dateRange);

    // Fetch adoption data, alerts, teacher effectiveness, and heatmap in parallel
    const [adoptionData, alertsData, teacherEffectiveness, heatmapData] =
      await Promise.all([
        getAdoptionDataModel(schoolId, dateRange),
        getAdminAlerts(schoolId, dateRange),
        getTeacherEffectivenessModel(schoolId, dateRange),
        getAdminHeatmapModel(schoolId, dateRange),
      ]);

    const avgRaLevel = Math.round(averageReadingLevel as number);
    const avgCefrLevel = convertRaLevelToCefr(avgRaLevel);

    const response = {
      summary: {
        activeStudents,
        activeTeachers,
        activeClassrooms,
        totalReadingSessions,
        averageReadingLevel: Math.round((averageReadingLevel as number) * 10),
      },
      recentActivity: {
        newUsersToday,
        activeUsersToday,
        readingSessionsToday,
      },
      systemHealth: {
        status: "healthy" as const,
        lastChecked: new Date().toISOString(),
      },
      adoption: {
        avgCefrLevel,
        totalXp,
        totalTeachers,
      },
      adoptionData,
      alerts: alertsData.alerts,
      alertsSummary: alertsData.summary,
      teacherEffectiveness: {
        teachers: teacherEffectiveness.teachers,
        summary: teacherEffectiveness.summary,
      },
      heatmap: heatmapData,
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    return response;
  } catch (error) {
    console.error("[Controller] fetchAdminDashboard - Error:", error);
    throw error;
  }
}

export async function fetchAdminHeatmapController(
  schoolId?: string,
  timeframe?: string,
) {
  try {
    const heatmapData = await getAdminHeatmapModel(schoolId, timeframe);
    return heatmapData;
  } catch (error) {
    console.error("[Controller] fetchAdminHeatmap - Error:", error);
    throw error;
  }
}
