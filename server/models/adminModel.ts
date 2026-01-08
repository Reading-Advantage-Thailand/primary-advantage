import { prisma } from "@/lib/prisma";
import { ActivityType, Role } from "@/types/enum";
import { startOfDay, subDays, subMonths } from "date-fns";
import { AdminAlertsResponse, Alert } from "@/types/dashboard";

export const getAdminDashboardModel = async (
  schoolId?: string,
  dateRange?: string,
) => {
  try {
    let daysAgo = parseInt(dateRange || "30");

    if (isNaN(daysAgo)) {
      daysAgo = 30;
    }

    const startDate = startOfDay(subDays(new Date(), daysAgo));

    const schoolFilter = schoolId ? { schoolId: { equals: schoolId } } : {};

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
    ] = await prisma.$transaction([
      // Total students
      prisma.user.findMany({
        where: {
          ...schoolFilter,
          roles: {
            some: {
              role: {
                name: Role.student,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          level: true,
          cefrLevel: true,
          xp: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Total teachers
      prisma.user.count({
        where: {
          ...schoolFilter,
          roles: {
            some: {
              role: {
                name: Role.teacher,
              },
            },
          },
        },
      }),

      // Active students
      prisma.user.count({
        where: {
          ...schoolFilter,
          roles: {
            some: {
              role: {
                name: Role.student,
              },
            },
          },
          lastActiveAt: {
            gte: startDate,
          },
        },
      }),

      // Active teachers
      prisma.user.count({
        where: {
          ...schoolFilter,
          roles: {
            some: {
              role: {
                name: {
                  in: [Role.teacher, Role.admin],
                },
              },
            },
          },
          lastActiveAt: {
            gte: startDate,
          },
        },
      }),

      // Active classrooms
      prisma.classroomStudent.count({
        where: {
          student: {
            ...schoolFilter,
            lastActiveAt: {
              gte: startDate,
            },
          },
        },
      }),

      // Total reading sessions
      prisma.assignmentStudent.count({
        where: {
          createdAt: {
            gte: startDate,
          },
          student: {
            ...schoolFilter,
          },
        },
      }),

      // Average reading level
      prisma.user.aggregate({
        where: {
          ...schoolFilter,
          roles: {
            some: {
              role: {
                name: Role.student,
              },
            },
          },
        },
        _avg: {
          level: true,
        },
      }),

      // Total new users today
      prisma.user.count({
        where: {
          ...schoolFilter,
          createdAt: {
            gte: startOfDay(new Date()),
          },
        },
      }),

      // Active users today
      prisma.user.count({
        where: {
          ...schoolFilter,
          lastActiveAt: {
            gte: startOfDay(new Date()),
          },
        },
      }),

      // Reading sessions today
      prisma.assignmentStudent.count({
        where: {
          createdAt: {
            gte: startOfDay(new Date()),
          },
          student: {
            ...schoolFilter,
          },
        },
      }),

      //Total XP
      prisma.xPLogs.aggregate({
        where: {
          user: {
            ...schoolFilter,
            roles: {
              some: {
                role: {
                  name: Role.student,
                },
              },
            },
          },
          createdAt: {
            gte: startDate,
          },
        },
        _sum: { xpEarned: true },
      }),

      //User ReadActivityLog
      prisma.article.findMany({
        where: {
          articleActivityLog: {
            some: {
              user: {
                ...schoolFilter,
                roles: {
                  some: {
                    role: {
                      name: Role.student,
                    },
                  },
                },
              },
              isRead: true,
              isRated: true,
              createdAt: {
                gte: subMonths(new Date(), 6),
              },
            },
          },
        },
        select: {
          id: true,
          cefrLevel: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      //License Data
      prisma.license.findMany({
        where: {
          ...schoolFilter,
        },
        include: {
          School: {
            select: {
              id: true,
              name: true,
              _count: {
                select: { users: true },
              },
            },
          },
        },
      }),

      //User Activity Log
      prisma.userActivity.findMany({
        where: {
          user: {
            ...schoolFilter,
            roles: {
              some: {
                role: {
                  name: Role.student,
                },
              },
            },
          },
          // activityType: {
          //   in: [ActivityType.ARTICLE_READ, ActivityType.ARTICLE_RATING],
          // },
          createdAt: { gte: subMonths(new Date(), 6) },
        },
        select: {
          id: true,
          userId: true,
          activityType: true,
          targetId: true,
          completed: true,
          createdAt: true,
          details: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return [
      studentsData,
      totalTeachers,
      activeStudents,
      activeTeachers,
      activeClassrooms,
      totalReadingSessions,
      averageReadingLevel._avg.level ?? 0,
      newUsersToday,
      activeUsersToday,
      readingSessionsToday,
      totalXp._sum.xpEarned ?? 0,
      userReadActivityLog,
      licensesData,
      userActivityLog,
    ];
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    throw error;
  }
};

interface AdoptionByLevel {
  level: string;
  cefrLevel: string;
  studentCount: number;
  activeCount: number;
  activeRate: number;
  averageXp: number;
}

interface AdoptionData {
  byGrade: AdoptionByLevel[];
  byCEFR: AdoptionByLevel[];
  summary: {
    totalStudents: number;
    activeStudents: number;
    overallActiveRate: number;
  };
}

export async function getAdoptionDataModel(
  schoolId?: string,
  dateRange?: string,
): Promise<AdoptionData> {
  try {
    // Calculate date range based on timeframe
    const startDate = startOfDay(
      subDays(new Date(), parseInt(dateRange || "30")),
    );

    // Build school filter
    const schoolFilter = schoolId ? { schoolId: { equals: schoolId } } : {};

    // Get all students with their data
    const students = await prisma.user.findMany({
      where: {
        ...schoolFilter,
        roles: {
          some: {
            role: {
              name: Role.student,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        cefrLevel: true,
        xp: true,
        level: true,
      },
    });

    const studentIds = students.map((s) => s.id);

    // Get active user IDs based on ARTICLE_READ activity
    const articleReadActivities = await prisma.userActivity.findMany({
      where: {
        userId: { in: studentIds },
        activityType: ActivityType.ARTICLE_READ,
        createdAt: { gte: startDate },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    const activeUserIds = new Set(
      articleReadActivities.map((activity) => activity.userId),
    );

    // Define CEFR levels
    const cefrLevels = [
      "A0-",
      "A0",
      "A0+",
      "A1-",
      "A1",
      "A1+",
      "A2-",
      "A2",
      "A2+",
      "B1-",
      "B1",
      "B1+",
      "B2-",
      "B2",
      "B2+",
      "C1-",
      "C1",
      "C1+",
      "C2-",
      "C2",
    ];

    // Group students by CEFR level
    const cefrGroups = new Map<
      string,
      { students: typeof students; active: number }
    >();

    // Initialize groups
    cefrLevels.forEach((level) => {
      cefrGroups.set(level, { students: [], active: 0 });
    });

    // Group students
    students.forEach((student) => {
      const cefrLevel = student.cefrLevel || "A1";
      if (!cefrGroups.has(cefrLevel)) {
        cefrGroups.set(cefrLevel, { students: [], active: 0 });
      }

      const group = cefrGroups.get(cefrLevel)!;
      group.students.push(student);

      if (activeUserIds.has(student.id)) {
        group.active++;
      }
    });

    // Create CEFR adoption data (group similar levels together)
    const cefrMainLevels = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];
    const byCEFR: AdoptionByLevel[] = cefrMainLevels
      .map((mainLevel) => {
        // Include variations like A1-, A1, A1+
        const relatedLevels = cefrLevels.filter((l) => l.startsWith(mainLevel));

        let totalStudents = 0;
        let totalActive = 0;
        let totalXp = 0;
        let studentCount = 0;

        relatedLevels.forEach((level) => {
          const group = cefrGroups.get(level);
          if (group) {
            totalStudents += group.students.length;
            totalActive += group.active;
            group.students.forEach((s) => {
              totalXp += s.xp || 0;
              studentCount++;
            });
          }
        });

        const averageXp =
          studentCount > 0 ? Math.round(totalXp / studentCount) : 0;
        const activeRate =
          totalStudents > 0
            ? Math.round((totalActive / totalStudents) * 100)
            : 0;

        return {
          level: mainLevel,
          cefrLevel: mainLevel,
          studentCount: totalStudents,
          activeCount: totalActive,
          activeRate,
          averageXp,
        };
      })
      .filter((level) => level.studentCount > 0);

    // Create grade-based distribution (estimate based on level)
    const gradeLevels = [
      { name: "Grade 1-3", cefrRange: ["A0-", "A0", "A0+", "A1-", "A1"] },
      { name: "Grade 4-6", cefrRange: ["A1+", "A2-", "A2"] },
      { name: "Grade 7-9", cefrRange: ["A2+", "B1-", "B1"] },
      {
        name: "Grade 10-12",
        cefrRange: ["B1+", "B2-", "B2", "B2+", "C1-", "C1", "C1+", "C2-", "C2"],
      },
    ];

    const byGrade: AdoptionByLevel[] = gradeLevels
      .map((grade) => {
        let totalStudents = 0;
        let totalActive = 0;
        let totalXp = 0;
        let studentCount = 0;

        grade.cefrRange.forEach((level) => {
          const group = cefrGroups.get(level);
          if (group) {
            totalStudents += group.students.length;
            totalActive += group.active;
            group.students.forEach((s) => {
              totalXp += s.xp || 0;
              studentCount++;
            });
          }
        });

        const averageXp =
          studentCount > 0 ? Math.round(totalXp / studentCount) : 0;
        const activeRate =
          totalStudents > 0
            ? Math.round((totalActive / totalStudents) * 100)
            : 0;
        const mainCefr =
          grade.cefrRange[Math.floor(grade.cefrRange.length / 2)] || "A1";

        return {
          level: grade.name,
          cefrLevel: mainCefr,
          studentCount: totalStudents,
          activeCount: totalActive,
          activeRate,
          averageXp,
        };
      })
      .filter((level) => level.studentCount > 0);

    return {
      byGrade,
      byCEFR,
      summary: {
        totalStudents: students.length,
        activeStudents: activeUserIds.size,
        overallActiveRate:
          students.length > 0
            ? Math.round((activeUserIds.size / students.length) * 100)
            : 0,
      },
    };
  } catch (error) {
    console.error("Error in getAdoptionDataModel:", error);
    throw error;
  }
}

export async function getAdminAlerts(
  schoolId?: string,
  dateRange?: string,
): Promise<AdminAlertsResponse> {
  try {
    const alerts: Alert[] = [];

    // Build where clause for schools
    let schoolWhere: any = {};

    // If schoolId is provided, only get the specific school
    if (schoolId) {
      schoolWhere = { id: schoolId };
    }

    // Get schools to check for issues (filtered by schoolId if provided)
    const schools = await prisma.school.findMany({
      where: schoolWhere,
      include: {
        users: {
          select: {
            id: true,
            roles: {
              include: {
                role: true,
              },
            },
            userActivity: {
              select: {
                createdAt: true,
              },
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        licenses: {
          select: {
            id: true,
            maxUsers: true,
            expiryDate: true,
          },
        },
      },
    });

    // Check each school for potential issues
    schools.forEach((school: any) => {
      // Filter students from users
      const students = school.users.filter((u: any) =>
        u.roles.some((ur: any) => ur.role.name === Role.student),
      );
      const activeStudents = students.filter((u: any) =>
        u.userActivity.some(
          (a: { createdAt: Date }) =>
            new Date(a.createdAt) >= subDays(new Date(), 30),
        ),
      );

      // Alert: Low student activity
      if (students.length > 0) {
        const activeRate = (activeStudents.length / students.length) * 100;
        if (activeRate < 30) {
          alerts.push({
            id: `low-activity-${school.id}`,
            type: "warning",
            severity: activeRate < 10 ? "high" : "medium",
            title: "Low Student Activity",
            message: `Only ${Math.round(activeRate)}% of students in ${school.name} were active in the last 30 days.`,
            schoolId: school.id,
            schoolName: school.name,
            createdAt: new Date().toISOString(),
            acknowledged: false,
          });
        }
      }

      // Alert: Expiring licenses
      school.licenses?.forEach((license: any) => {
        const expiryDate = license.expiryDate;
        if (expiryDate && new Date(expiryDate) <= subDays(new Date(), 7)) {
          const daysUntilExpiry = Math.ceil(
            (new Date(expiryDate).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          );

          alerts.push({
            id: `expiring-license-${license.id}`,
            type: "warning",
            severity: daysUntilExpiry <= 3 ? "critical" : "high",
            title: "License Expiring Soon",
            message: `A license for ${school.name} expires in ${daysUntilExpiry} day(s).`,
            schoolId: school.id,
            schoolName: school.name,
            createdAt: new Date().toISOString(),
            acknowledged: false,
          });
        }
      });

      // Alert: License capacity issues
      // Count total users in school as "licenses used"
      const totalUsers = school.users?.length || 0;
      const totalSeats =
        school.licenses?.reduce(
          (sum: number, lic: any) => sum + (lic.maxUsers || 0),
          0,
        ) || 0;

      if (totalSeats > 0 && totalUsers >= totalSeats * 0.9) {
        alerts.push({
          id: `license-capacity-${school.id}`,
          type: "warning",
          severity: totalUsers >= totalSeats ? "critical" : "high",
          title: "License Capacity Warning",
          message: `${school.name} is using ${totalUsers} of ${totalSeats} available license seats (${Math.round((totalUsers / totalSeats) * 100)}%).`,
          schoolId: school.id,
          schoolName: school.name,
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    });

    // Sort alerts by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    const response: AdminAlertsResponse = {
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        unacknowledged: alerts.filter((a) => !a.acknowledged).length,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    return response;
  } catch (error) {
    console.error("[Model] getAdminAlerts - Error:", error);

    // Return empty response on error
    return {
      alerts: [],
      summary: {
        total: 0,
        critical: 0,
        unacknowledged: 0,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Get teacher effectiveness metrics
 * @param schoolId - Optional school ID to filter teachers
 * @param dateRange - Date range string (e.g., "7", "30", "90")
 * @returns Teacher effectiveness data with summary
 */
export async function getTeacherEffectivenessModel(
  schoolId?: string,
  dateRange?: string,
) {
  try {
    // Calculate date range
    const startDate = startOfDay(
      subDays(new Date(), parseInt(dateRange || "30")),
    );

    // Build school filter
    const schoolFilter = schoolId
      ? {
          schoolId: { equals: schoolId },
        }
      : {};

    // Get all teachers with their classrooms and students
    const teachers = await prisma.user.findMany({
      where: {
        ...schoolFilter,
        roles: {
          some: {
            role: {
              name: {
                in: [Role.teacher, Role.admin],
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        ClassroomTeachers: {
          select: {
            classroom: {
              select: {
                id: true,
                name: true,
                students: {
                  select: {
                    student: {
                      select: {
                        id: true,
                        name: true,
                        userActivity: {
                          select: {
                            createdAt: true,
                          },
                          where: {
                            createdAt: {
                              gte: startDate,
                            },
                          },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate metrics for each teacher
    const teacherMetrics = teachers.map((teacher) => {
      const classrooms = teacher.ClassroomTeachers.map((tc: any) => {
        const students = tc.classroom.students;
        const activeStudents = students.filter(
          (cs: any) => cs.student.userActivity.length > 0,
        );

        return {
          id: tc.classroom.id,
          name: tc.classroom.name || "Unnamed Classroom",
          studentCount: students.length,
          activeCount: activeStudents.length,
        };
      });

      const totalStudents = classrooms.reduce(
        (sum: number, c: any) => sum + c.studentCount,
        0,
      );
      const totalActive = classrooms.reduce(
        (sum: number, c: any) => sum + c.activeCount,
        0,
      );
      const engagementRate =
        totalStudents > 0 ? Math.round((totalActive / totalStudents) * 100) : 0;

      return {
        teacherId: teacher.id,
        teacherName: teacher.name || "Unknown",
        email: teacher.email || "",
        studentCount: totalStudents,
        activeStudents: totalActive,
        engagementRate,
        classroomCount: classrooms.length,
        classrooms,
      };
    });

    // Filter out teachers with no students and sort by engagement rate
    const filteredTeachers = teacherMetrics
      .filter((t) => t.studentCount > 0)
      .sort((a, b) => b.engagementRate - a.engagementRate);

    // Calculate summary
    const totalStudents = filteredTeachers.reduce(
      (sum, t) => sum + t.studentCount,
      0,
    );
    const totalActive = filteredTeachers.reduce(
      (sum, t) => sum + t.activeStudents,
      0,
    );
    const averageEngagement =
      filteredTeachers.length > 0
        ? Math.round(
            filteredTeachers.reduce((sum, t) => sum + t.engagementRate, 0) /
              filteredTeachers.length,
          )
        : 0;

    return {
      teachers: filteredTeachers,
      summary: {
        totalTeachers: filteredTeachers.length,
        averageEngagement,
        totalStudents,
        totalActiveStudents: totalActive,
      },
    };
  } catch (error) {
    console.error("[Model] getTeacherEffectivenessModel - Error:", error);
    throw error;
  }
}

/**
 * Get admin heatmap data for activity visualization
 * @param schoolId - Optional school ID to filter activities
 * @param timeframe - Date range in days (e.g., "7", "30", "90")
 * @returns Heatmap data with activity buckets and metadata
 */
export async function getAdminHeatmapModel(
  schoolId?: string,
  timeframe?: string,
) {
  const startTime = Date.now();

  try {
    // Parse and validate parameters
    const daysAgo = parseInt(timeframe || "30", 10);
    const startDate = startOfDay(subDays(new Date(), daysAgo));
    const endDate = new Date();

    // Early return if no school specified
    if (!schoolId) {
      return createEmptyHeatmapResponse(startDate, endDate);
    }

    // Fetch data from database
    const { activities, availableTypes, userIds } =
      await fetchHeatmapActivities(schoolId, startDate);

    // Handle no users case
    if (userIds.length === 0) {
      return createEmptyHeatmapResponse(startDate, endDate);
    }

    // Handle no activities case
    if (activities.length === 0) {
      return {
        scope: "school",
        entityId: schoolId,
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
      entityId: schoolId,
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
    console.error("[Model] getAdminHeatmapModel - Error:", error);
    throw error;
  }
}

/**
 * Helper: Fetch activities from database by school ID
 */
async function fetchHeatmapActivities(schoolId: string, startDate: Date) {
  return await prisma.$transaction(async (tx) => {
    // Get users from the school directly
    const users = await tx.user.findMany({
      where: { schoolId },
      select: { id: true },
      take: 5000, // Increased limit for larger schools
    });

    const userIds = users.map((u) => u.id);

    if (userIds.length === 0) {
      return { activities: [], availableTypes: [], userIds: [] };
    }

    // Build where clause for activities
    const whereClause = {
      userId: { in: userIds },
      createdAt: { gte: startDate },
    };

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
