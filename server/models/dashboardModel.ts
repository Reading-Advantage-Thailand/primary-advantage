import { AuthenticatedUser } from "../utils/middleware";
import { startOfDay } from "date-fns";
import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/enum";

export const getDashboardHeatmapModel = async (
  entityIds?: string,
  timeframe?: string,
  user?: AuthenticatedUser,
) => {
  try {
    const startTime = Date.now();

    try {
      // Parse and validate parameters
      const daysAgo = parseInt(timeframe || "30");
      const startDate = startOfDay(subDays(new Date(), daysAgo));
      const endDate = new Date();

      const role = user?.role;

      // Early return if no school specified
      if (!entityIds) {
        return createEmptyHeatmapResponse(startDate, endDate);
      }

      // Fetch data from database
      const { activities, availableTypes, userIds } =
        await fetchHeatmapActivities(entityIds, startDate, role as Role);

      // Handle no users case
      if (userIds.length === 0) {
        return createEmptyHeatmapResponse(startDate, endDate);
      }

      // Handle no activities case
      if (activities.length === 0) {
        return {
          scope: "school",
          entityId: entityIds,
          timeframe,
          granularity: "day",
          timezone: "UTC",
          activityTypes: [],
          buckets: [],
          metadata: {
            totalActivities: 0,
            uniqueStudents: userIds.length,
            dateRange: {
              start: startDate.toISOString().split("T")[0],
              end: endDate.toISOString().split("T")[0],
            },
            availableActivityTypes: availableTypes.map((t) => t.activityType),
          },
          cache: {
            cached: false,
            generatedAt: new Date().toISOString(),
          },
        };
      }

      // Process activities into buckets
      const { buckets, allUniqueStudents } =
        processActivitiesIntoBuckets(activities);

      // Calculate summary metrics
      const totalActivities = buckets.reduce(
        (sum, bucket) => sum + bucket.activityCount,
        0,
      );

      const duration = Date.now() - startTime;

      return {
        scope: "school",
        entityId: entityIds,
        timeframe,
        granularity: "day",
        timezone: "UTC",
        activityTypes: [],
        buckets,
        metadata: {
          totalActivities,
          uniqueStudents: allUniqueStudents.size,
          dateRange: {
            start: startDate.toISOString().split("T")[0],
            end: endDate.toISOString().split("T")[0],
          },
          availableActivityTypes: availableTypes.map((t) => t.activityType),
        },
        cache: {
          cached: false,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("[Model] getDashboardHeatmap - Error:", error);
      throw error;
    }
  } catch (error) {
    console.error("[Model] getDashboardHeatmap - Error:", error);
    throw error;
  }
};

/**
 * Helper: Process activities into date buckets
 */
function processActivitiesIntoBuckets(activities: any[]) {
  const bucketMap = new Map<
    string,
    {
      date: string;
      hour: number;
      dayOfWeek: number;
      activityType: string;
      activityCount: number;
      completedCount: number;
      uniqueStudents: Set<string>;
      totalDurationMinutes: number;
    }
  >();

  // Track all unique students across all activities (more efficient)
  const allUniqueStudents = new Set<string>();

  // Process each activity
  activities.forEach((activity) => {
    const date = activity.createdAt.toISOString().split("T")[0];
    const hour = 0; // Daily granularity
    const dayOfWeek = activity.createdAt.getDay();
    const key = `${date}-${hour}-${activity.activityType}`;

    // Initialize bucket if not exists
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        date,
        hour,
        dayOfWeek,
        activityType: activity.activityType,
        activityCount: 0,
        completedCount: 0,
        uniqueStudents: new Set(),
        totalDurationMinutes: 0,
      });
    }

    // Update bucket metrics
    const bucket = bucketMap.get(key)!;
    bucket.activityCount++;
    if (activity.completed) bucket.completedCount++;
    bucket.uniqueStudents.add(activity.userId);
    if (activity.timer) {
      bucket.totalDurationMinutes += activity.timer / 60;
    }

    // Track overall unique students
    allUniqueStudents.add(activity.userId);
  });

  // Convert map to array with calculated metrics
  const buckets = Array.from(bucketMap.values()).map((bucket) => ({
    date: bucket.date,
    hour: bucket.hour,
    dayOfWeek: bucket.dayOfWeek,
    activityType: bucket.activityType,
    activityCount: bucket.activityCount,
    completedCount: bucket.completedCount,
    uniqueStudents: bucket.uniqueStudents.size,
    totalDurationMinutes: Math.round(bucket.totalDurationMinutes * 100) / 100,
    avgDurationMinutes:
      bucket.activityCount > 0
        ? Math.round(
            (bucket.totalDurationMinutes / bucket.activityCount) * 100,
          ) / 100
        : 0,
  }));

  return { buckets, allUniqueStudents };
}

/**
 * Helper: Create empty heatmap response
 */
function createEmptyHeatmapResponse(startDate: Date, endDate: Date) {
  return {
    scope: "license" as const,
    entityId: null,
    timeframe: "30",
    granularity: "day" as const,
    timezone: "UTC",
    activityTypes: [],
    buckets: [],
    metadata: {
      totalActivities: 0,
      uniqueStudents: 0,
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      availableActivityTypes: [],
    },
    cache: {
      cached: false,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Helper: Fetch activities from database by school ID
 */
async function fetchHeatmapActivities(
  entityIds: string,
  startDate: Date,
  role: Role,
) {
  return await prisma.$transaction(async (tx) => {
    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };

    let userIds: string[] = [];

    if (role === Role.student) {
      whereClause.userId = entityIds;
      userIds = [entityIds || ""];
    } else if (role === Role.admin || role === Role.system) {
      // Get users from the school in transaction
      const schoolUsers = await tx.user.findMany({
        where: { schoolId: entityIds },
        select: { id: true },
        take: 1000, // Limit to prevent huge result sets
      });

      userIds = schoolUsers.map((u) => u.id);

      if (userIds.length === 0) {
        return { activities: [], availableTypes: [], userIds: [] };
      }

      // Build where clause for activities
      whereClause.userId = { in: userIds };
    }

    // Fetch activities and available types in parallel
    const [activities, availableTypes] = await Promise.all([
      tx.userActivity.findMany({
        where: whereClause,
        select: {
          userId: true,
          activityType: true,
          completed: true,
          timer: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: 50000, // Increased limit for better data coverage
      }),
      tx.userActivity.findMany({
        where: { userId: { in: userIds } },
        select: { activityType: true },
        distinct: ["activityType"],
      }),
    ]);

    return { activities, availableTypes, userIds };
  });
}
