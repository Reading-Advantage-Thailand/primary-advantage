import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, subYears } from "date-fns";

interface DashboardSummaryResponse {
  activity: {
    totalSessions: number;
    totalActiveUsers: number;
    averageSessionLength: number;
  };
  alignment: {
    alignmentScore: number;
  };
  velocity: {
    avgXpPerStudent7d: number;
    avgXpPerStudent30d: number;
  };
  trends: {
    sessionsGrowth: number;
    usersGrowth: number;
    sessionTimeGrowth: number;
    velocityGrowth: number;
    alignmentGrowth: number;
  };
  cache: {
    cached: boolean;
    generatedAt: string;
  };
}

export const getSystemDashboardModel = async () => {
  const data = await prisma.$transaction(async (tx) => {
    const totalSchools = await tx.school.count();
    const totalStudents = await tx.user.count({
      where: {
        roles: {
          some: {
            role: {
              name: "student",
            },
          },
        },
      },
    });
    const totalTeachers = await tx.user.count({
      where: {
        roles: {
          some: {
            role: {
              name: "teacher",
            },
          },
        },
      },
    });
    const totalArticles = await tx.article.count();
    return {
      totalSchools,
      totalStudents,
      totalTeachers,
      totalArticles,
    };
  });
  return data;
};

export const getSystemHealthModel = async () => {
  try {
    const ResponseTime = await prisma.$queryRaw`SELECT 1`;
    const totalActivities = await prisma.userActivity.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    return {
      ResponseTime,
      totalActivities,
    };
  } catch (error) {
    console.error("Error getting system health:", error);
    return {
      error: "Error getting system health",
    };
  }
};

export const getRecentActivitiesModel = async (limit: number = 5) => {
  try {
    const activities = await prisma.userActivity.findMany({
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            roles: {
              select: {
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return activities;
  } catch (error) {
    console.error("Error getting recent activities:", error);
  }
};

export const getActivityMetricsModel = async (
  dateRange?: string | number,
  schoolId?: string,
  classId?: string,
) => {
  try {
    // Calculate date range
    const now = new Date();
    const daysAgo = parseInt(dateRange?.toString() || "30");
    const startDate = startOfDay(subDays(now, daysAgo));

    // Build where clause based on filters
    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (dateRange === "all") {
      delete whereClause.createdAt;
    }

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }
    // Get daily activity data
    const activities = await prisma.userActivity.findMany({
      where: whereClause,
      select: {
        userId: true,
        createdAt: true,
        timer: true,
        user: {
          select: {
            createdAt: true,
            studentClassroom: classId
              ? {
                  where: {
                    classroomId: classId,
                  },
                  select: {
                    id: true,
                  },
                }
              : undefined,
          },
        },
      },
    });
    // Filter by class if specified
    const filteredActivities = classId
      ? activities.filter((a: any) => a.user.studentClassrooms?.length > 0)
      : activities;

    return { filteredActivities, startDate, now };
  } catch (error) {
    console.error("Error getting activity metrics:", error);
    throw error;
  }
};

export const getAssignmentMetricsModel = async (
  dateRange?: string | number,
  schoolId?: string,
  classId?: string,
) => {
  try {
    const now = new Date();
    const daysAgo = parseInt(dateRange?.toString() || "30");
    const startDate = startOfDay(subDays(now, daysAgo));

    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (dateRange === "all") {
      delete whereClause.createdAt;
    }

    if (classId) {
      whereClause.classroomId = classId;
    } else if (schoolId) {
      whereClause.classroom = {
        schoolId,
      };
    }
    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      select: {
        id: true,
        articleId: true,
        name: true,
        dueDate: true,
        createdAt: true,
        AssignmentStudent: {
          select: {
            id: true,
            status: true,
            score: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return assignments;
  } catch (error) {
    console.error("Error getting assignment metrics:", error);
    throw error;
  }
};

export const getDailyActivityUsersModel = async (licenseId?: string) => {
  try {
    const startDate = new Date(new Date().setHours(0, 0, 0, 0));
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const totalActiveUsers = await prisma.userActivity.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });
    return totalActiveUsers;
  } catch (error) {
    console.error("Error getting daily activity users:", error);
    throw error;
  }
};

export const getActiveUsersModel = async (dateRange?: string | number) => {
  try {
    // Calculate date range based on parameter
    const now = new Date();
    let startDate: Date;
    let daysAgo: number;

    if (dateRange === "7d") {
      daysAgo = 7;
    } else if (dateRange === "90d") {
      daysAgo = 90;
    } else if (dateRange === "all") {
      // For 'all', get the earliest activity date
      const earliestActivity = await prisma.userActivity.findFirst({
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
        },
      });
      startDate = earliestActivity
        ? new Date(earliestActivity.createdAt)
        : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // Default to 1 year
      daysAgo = Math.ceil(
        (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
      );
    } else {
      // Default to 30 days
      daysAgo = 30;
    }

    // Set start date if not already set (for 'all' case)
    if (!startDate!) {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysAgo);
      startDate.setHours(0, 0, 0, 0);
    }

    // Get all activities within the date range
    const activities = await prisma.userActivity.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        userId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group activities by date and count unique users
    const dateMap = new Map<string, Set<string>>();

    // Initialize all dates in the range
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dateMap.set(dateKey, new Set());
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add users to their respective dates
    activities.forEach((activity) => {
      const dateKey = new Date(activity.createdAt).toISOString().split("T")[0];
      const userSet = dateMap.get(dateKey);
      if (userSet) {
        userSet.add(activity.userId);
      }
    });

    // Convert to chartData format
    const chartData = Array.from(dateMap.entries())
      .map(([date, userSet]) => ({
        date,
        noOfUsers: userSet.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate trend (compare last period with previous period)
    let trend: { value: number; direction: "up" | "down" } | null = null;

    if (chartData.length >= 2) {
      // Calculate average for the last half vs first half
      const midPoint = Math.floor(chartData.length / 2);
      const firstHalf = chartData.slice(0, midPoint);
      const secondHalf = chartData.slice(midPoint);

      const firstHalfAvg =
        firstHalf.reduce((sum, item) => sum + item.noOfUsers, 0) /
        firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, item) => sum + item.noOfUsers, 0) /
        secondHalf.length;

      if (firstHalfAvg > 0) {
        const change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
        trend = {
          value: Math.abs(parseFloat(change.toFixed(1))),
          direction: change >= 0 ? "up" : "down",
        };
      } else if (secondHalfAvg > 0) {
        // If first half is 0 but second half has users, it's an upward trend
        trend = {
          value: 100,
          direction: "up",
        };
      }
    }

    return {
      trend,
      chartData,
    };
  } catch (error) {
    console.error("Error getting active users:", error);
    throw error;
  }
};

export const getMetricsCardsModel = async (dateRange?: string | number) => {
  try {
    const startTime = Date.now();
    const daysAgo = parseInt(dateRange?.toString() || "30");
    const days = isNaN(daysAgo) ? 365 : daysAgo;

    const fetchSummaryData = async (): Promise<DashboardSummaryResponse> => {
      const now = new Date();

      // Current period: now - days to now
      const currentPeriodStart = new Date(now);
      currentPeriodStart.setDate(currentPeriodStart.getDate() - days);

      // Previous period: (now - 2*days) to (now - days)
      const previousPeriodStart = new Date(now);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);
      const previousPeriodEnd = new Date(now);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Use optimized batch query execution to minimize connection pool usage
      // Execute queries in parallel using Prisma
      const [
        activityData,
        activityPreviousData,
        alignmentData,
        velocityData,
        velocityPreviousData,
      ] = await Promise.all([
        // Activity: Current period
        prisma.userActivity.groupBy({
          by: ["userId"],
          where: {
            createdAt: { gte: currentPeriodStart },
          },
          _count: { id: true },
          _avg: {
            timer: true,
          },
        }),

        // Activity: Previous period
        prisma.userActivity.groupBy({
          by: ["userId"],
          where: {
            createdAt: {
              gte: previousPeriodStart,
              lt: previousPeriodEnd,
            },
          },
          _count: { id: true },
          _avg: {
            timer: true,
          },
        }),

        // Alignment: Get lesson progress with user levels and article levels
        prisma.userLessonProgress.findMany({
          where: {
            createdAt: { gte: currentPeriodStart },
            user: {
              roles: {
                some: {
                  role: { name: "student" },
                },
              },
            },
            article: {
              raLevel: { not: undefined },
            },
          },
          select: {
            user: {
              select: {
                level: true,
              },
            },
            article: {
              select: {
                raLevel: true,
              },
            },
          },
        }),

        // Velocity: Get all students with their XP for 7d and 30d
        (async () => {
          const students = await prisma.user.findMany({
            where: {
              roles: {
                some: {
                  role: { name: "student" },
                },
              },
            },
            select: { id: true },
          });

          const studentXP = await Promise.all(
            students.map(async (student) => {
              const [xp7d, xp30d] = await Promise.all([
                prisma.xPLogs.aggregate({
                  where: {
                    userId: student.id,
                    createdAt: { gte: sevenDaysAgo },
                  },
                  _sum: { xpEarned: true },
                }),
                prisma.xPLogs.aggregate({
                  where: {
                    userId: student.id,
                    createdAt: { gte: currentPeriodStart },
                  },
                  _sum: { xpEarned: true },
                }),
              ]);

              return {
                xp_7d: xp7d._sum.xpEarned || 0,
                xp_30d: xp30d._sum.xpEarned || 0,
              };
            }),
          );

          return studentXP;
        })(),

        // Velocity Previous: Get all students with their XP for previous period
        (async () => {
          const students = await prisma.user.findMany({
            where: {
              roles: {
                some: {
                  role: { name: "student" },
                },
              },
            },
            select: { id: true },
          });

          const studentXP = await Promise.all(
            students.map(async (student) => {
              const xpPrevious = await prisma.xPLogs.aggregate({
                where: {
                  userId: student.id,
                  createdAt: {
                    gte: previousPeriodStart,
                    lt: previousPeriodEnd,
                  },
                },
                _sum: { xpEarned: true },
              });

              return xpPrevious._sum.xpEarned || 0;
            }),
          );

          return studentXP;
        })(),
      ]);

      // Process activity data
      const totalSessions = activityData.reduce(
        (sum, item) => sum + item._count.id,
        0,
      );
      const totalUsers = activityData.length;
      const avgSessionLength =
        activityData.length > 0
          ? activityData.reduce((sum, item) => {
              const timer = item._avg.timer || 0;
              return sum + (timer > 0 ? timer / 60.0 : 0);
            }, 0) / activityData.length
          : 0;

      // Process previous activity data
      const totalSessionsPrevious = activityPreviousData.reduce(
        (sum, item) => sum + item._count.id,
        0,
      );
      const totalUsersPrevious = activityPreviousData.length;
      const avgSessionLengthPrevious =
        activityPreviousData.length > 0
          ? activityPreviousData.reduce((sum, item) => {
              const timer = item._avg.timer || 0;
              return sum + (timer > 0 ? timer / 60.0 : 0);
            }, 0) / activityPreviousData.length
          : 0;

      // Process alignment data
      const totalReadings = alignmentData.length;
      const alignedCount = alignmentData.filter((item) => {
        const studentLevel = item.user.level;
        const articleLevel = item.article.raLevel;
        return (
          articleLevel >= studentLevel - 1 && articleLevel <= studentLevel + 1
        );
      }).length;

      // Process velocity data
      const avgXp7d =
        velocityData.length > 0
          ? velocityData.reduce((sum, item) => sum + item.xp_7d, 0) /
            velocityData.length
          : 0;
      const avgXp30d =
        velocityData.length > 0
          ? velocityData.reduce((sum, item) => sum + item.xp_30d, 0) /
            velocityData.length
          : 0;

      // Process velocity previous data
      const avgXpPrevious =
        velocityPreviousData.length > 0
          ? velocityPreviousData.reduce((sum, xp) => sum + xp, 0) /
            velocityPreviousData.length
          : 0;

      // Calculate alignment score
      const alignmentScore =
        totalReadings > 0
          ? Math.round((alignedCount / totalReadings) * 100)
          : 0;

      // Calculate growth percentages (comparing current period vs previous period)
      const calculateGrowth = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const trends = {
        sessionsGrowth: calculateGrowth(totalSessions, totalSessionsPrevious),
        usersGrowth: calculateGrowth(totalUsers, totalUsersPrevious),
        sessionTimeGrowth: calculateGrowth(
          avgSessionLength,
          avgSessionLengthPrevious,
        ),
        velocityGrowth: calculateGrowth(avgXp30d, avgXpPrevious),
        alignmentGrowth: 0, // Alignment is aggregated data, trend not applicable
      };

      return {
        activity: {
          totalSessions: totalSessions,
          totalActiveUsers: totalUsers,
          averageSessionLength: Number(avgSessionLength.toFixed(1)),
        },
        alignment: {
          alignmentScore,
        },
        velocity: {
          avgXpPerStudent7d: Math.round(avgXp7d),
          avgXpPerStudent30d: Math.round(avgXp30d),
        },
        trends,
        cache: {
          cached: false,
          generatedAt: new Date().toISOString(),
        },
      };
    };

    const data = await fetchSummaryData();

    const duration = Date.now() - startTime;

    return data;
  } catch (error) {
    console.error("[Model] getMetricsCards - Error:", error);
    throw error;
  }
};

export const getSystemActivityChartsModel = async (
  dateRange?: string | number,
) => {
  try {
    const now = new Date();
    const daysAgo = parseInt(dateRange?.toString() || "30");
    const startDate = startOfDay(subDays(now, daysAgo));
    const yearAgo = startOfDay(subYears(now, 1));

    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (dateRange === "all") {
      whereClause.createdAt = {
        gte: yearAgo,
      };
    }

    // Fetch all activities within the date range
    const activities = await prisma.userActivity.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        activityType: true,
        targetId: true,
        completed: true,
        timer: true,
        createdAt: true,
        details: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: {
              select: {
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group activities by date for heatmap
    const activityByDate = new Map<string, number>();
    const sessionsByDate = new Map<string, Set<string>>();
    const usersByDate = new Map<string, Set<string>>();

    // Initialize all dates in the range
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split("T")[0];
      activityByDate.set(dateKey, 0);
      sessionsByDate.set(dateKey, new Set());
      usersByDate.set(dateKey, new Set());
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process activities
    activities.forEach((activity) => {
      const dateKey = new Date(activity.createdAt).toISOString().split("T")[0];

      // Count activities per day
      const currentCount = activityByDate.get(dateKey) || 0;
      activityByDate.set(dateKey, currentCount + 1);

      // Track unique users per day
      const usersSet = usersByDate.get(dateKey);
      if (usersSet) {
        usersSet.add(activity.userId);
      }

      // Track sessions (count activities as sessions)
      const sessionsSet = sessionsByDate.get(dateKey);
      if (sessionsSet) {
        sessionsSet.add(activity.id);
      }
    });

    // Create heatmap data
    const heatmapData = Array.from(activityByDate.entries())
      .map(([date, value]) => {
        // Determine activity level based on count
        let level: "low" | "medium" | "high" | "very-high" = "low";
        if (value === 0) level = "low";
        else if (value <= 3) level = "medium";
        else if (value <= 7) level = "high";
        else level = "very-high";

        return {
          date,
          value,
          level,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Create timeline events (recent activities)
    const timelineEvents = activities.slice(0, 50).map((activity) => {
      // Determine event type based on activity type
      let eventType: "reading" | "practice" | "assessment" | "achievement" =
        "reading";
      let title = "Activity";
      let description = "";

      switch (activity.activityType) {
        case "ARTICLE_READ":
          eventType = "reading";
          title = "Reading Activity";
          description = `Completed reading session`;
          break;

        case "SENTENCE_FLASHCARDS":
          eventType = "practice";
          title = "Flashcard Practice";
          description = `Practiced flashcards`;
          break;
        // case "ASSIGNMENT":
        //   eventType = "assessment";
        //   title = "Assignment Completed";
        //   description = `Completed an assignment`;
        //   break;
        // case "ACHIEVEMENT":
        //   eventType = "achievement";
        //   title = "Achievement Unlocked";
        //   description = `Earned an achievement`;
        //   break;
        default:
          eventType = "reading";
          title = "Activity";
      }

      return {
        id: activity.id,
        title,
        description,
        timestamp: activity.createdAt.toISOString(),
        type: eventType,
        user: activity.user.name || activity.user.email,
      };
    });

    // Create chart data
    const chartData = Array.from(activityByDate.entries())
      .map(([date, activityCount]) => {
        const users = usersByDate.get(date)?.size || 0;
        const sessions = sessionsByDate.get(date)?.size || 0;

        return {
          date: new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          activity: activityCount,
          users,
          sessions,
        };
      })
      .sort((a, b) => {
        // Sort by original date
        const dateA =
          Array.from(activityByDate.entries()).find(
            ([_, count]) => count === parseInt(a.activity.toString()),
          )?.[0] || "";
        const dateB =
          Array.from(activityByDate.entries()).find(
            ([_, count]) => count === parseInt(b.activity.toString()),
          )?.[0] || "";
        return dateA.localeCompare(dateB);
      });

    return {
      heatmapData,
      timelineEvents,
      chartData,
      metadata: {
        dateRange: dateRange === "all" ? 365 : dateRange,
        startDate: startDate || yearAgo,
        endDate: now.toISOString(),
        totalActivities: activities.length,
        totalUsers: new Set(activities.map((a) => a.userId)).size,
      },
    };
  } catch (error) {
    console.error("[Model] getSystemActivityCharts - Error:", error);
    throw error;
  }
};

export const getSystemLicensesModel = async () => {
  try {
    const licenses = await prisma.license.findMany();
    return licenses;
  } catch (error) {
    console.error("[Model] getSystemLicenses - Error:", error);
    throw error;
  }
};
