import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  StudentData,
  CreateStudentInput,
  UpdateStudentInput,
  UserWithRoles,
} from "@/types/index";
import { startOfDay, subYears } from "date-fns";
import { GoalStatus, GoalType, GoalPriority } from "@prisma/client";
import { CreateGoalInput, UpdateGoalInput } from "@/types/learning-goals";

export interface VelocityMetrics {
  userId: string;
  email: string;
  displayName: string | null;
  schoolId: string | null;
  currentXp: number;
  currentLevel: number;
  cefrLevel: string;

  // 7-day metrics
  xpLast7d: number;
  activeDays7d: number;
  xpPerActiveDay7d: number;
  xpPerCalendarDay7d: number;

  // 30-day metrics
  xpLast30d: number;
  activeDays30d: number;
  xpPerActiveDay30d: number;
  xpPerCalendarDay30d: number;

  // EMA and velocity
  emaVelocity: number;
  stdDev: number;

  // Level progression
  xpToNextLevel: number;
  nextLevelXp: number;

  // ETA
  etaDays: number | null;
  etaDate: string | null;
  etaConfidenceLow: number | null;
  etaConfidenceHigh: number | null;

  // Metadata
  lastActivityAt: Date | null;
  isLowSignal: boolean;
  confidenceBand: "high" | "medium" | "low" | "none";
}

// Type for student query parameters
interface StudentQueryParams {
  page: number;
  limit: number;
  search: string;
  classroomId: string;
  cefrLevel: string;
  userWithRoles: UserWithRoles;
}

// Get students with pagination and filtering
export const getStudents = async (
  params: StudentQueryParams,
): Promise<{
  students: StudentData[];
  totalCount: number;
}> => {
  const { page, limit, search, classroomId, cefrLevel, userWithRoles } = params;

  try {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where clause based on user's permissions
    let whereClause: any = {
      roles: {
        some: {
          role: {
            name: "student",
          },
        },
      },
    };

    // If user is school admin, only show students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      userWithRoles.role !== "system"
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
    }

    // Add search filter
    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Add classroom filter
    if (classroomId) {
      whereClause.studentClassroom = {
        some: {
          classroomId: classroomId,
        },
      };
    }

    // Add CEFR level filter
    if (cefrLevel) {
      whereClause.cefrLevel = cefrLevel;
    }

    // Fetch students with classroom information
    const [students, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          studentClassroom: {
            include: {
              classroom: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    // Transform data for response
    const studentsData: StudentData[] = students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      cefrLevel: student.cefrLevel,
      xp: student.xp,
      role: student.role || "student",
      createdAt: student.createdAt.toISOString().split("T")[0],
      className: student.studentClassroom[0]?.classroom.name || null,
      classroomId: student.studentClassroom[0]?.classroom.id || null,
    }));

    return { students: studentsData, totalCount };
  } catch (error) {
    console.error("Student Model: Error fetching students:", error);
    throw error;
  }
};

// Get student by ID
export const getStudentById = async (
  id: string,
  userWithRoles: UserWithRoles,
): Promise<StudentData | null> => {
  try {
    console.log("Student Model: Fetching student by ID:", id);

    // Build where clause based on user's permissions
    let whereClause: any = {
      id,
      roles: {
        some: {
          role: {
            name: "student",
          },
        },
      },
    };

    // If user is school admin, only show students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      userWithRoles.role !== "system"
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
    }

    const student = await prisma.user.findFirst({
      where: whereClause,
      include: {
        studentClassroom: {
          include: {
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      console.log("Student Model: Student not found:", id);
      return null;
    }

    // Transform data
    const studentData: StudentData = {
      id: student.id,
      name: student.name,
      email: student.email,
      cefrLevel: student.cefrLevel,
      xp: student.xp,
      role: student.role || "student",
      createdAt: student.createdAt.toISOString().split("T")[0],
      className: student.studentClassroom[0]?.classroom.name || null,
      classroomId: student.studentClassroom[0]?.classroom.id || null,
    };

    console.log("Student Model: Successfully fetched student:", studentData.id);
    return studentData;
  } catch (error) {
    console.error("Student Model: Error fetching student by ID:", error);
    throw error;
  }
};

// Create new student
export const createStudent = async (params: {
  name: string;
  email: string;
  cefrLevel: string;
  classroomId?: string;
  password?: string;
  userWithRoles: UserWithRoles;
}): Promise<{ success: boolean; student?: StudentData; error?: string }> => {
  const { name, email, cefrLevel, classroomId, password, userWithRoles } =
    params;

  try {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    console.log("Student Model: Creating student with email:", normalizedEmail);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      console.log("Student Model: User already exists with email:", email);
      return { success: false, error: "User with this email already exists" };
    }

    // Get the Student role ID
    const roleRecord = await prisma.role.findFirst({
      where: { name: "student" },
    });

    if (!roleRecord) {
      console.log("Student Model: Student role not found");
      return { success: false, error: "Student role not found" };
    }

    // Determine school assignment
    let schoolId = null;
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolId = userWithRoles.schoolId;
    }

    // Validate classroom if provided
    if (classroomId) {
      const classroom = await prisma.classroom.findFirst({
        where: {
          id: classroomId,
          ...(schoolId && { schoolId }),
        },
      });

      if (!classroom) {
        console.log("Student Model: Invalid classroom specified:", classroomId);
        return { success: false, error: "Invalid classroom specified" };
      }
    }

    // Generate password if not provided
    const hashedPassword = await hashPassword(
      password || Math.random().toString(36).slice(-8),
    );

    // Create the new student
    const newStudent = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        cefrLevel,
        schoolId,
        xp: 0,
        level: 1,
        role: "student",
        roleId: roleRecord.id,
        ...(classroomId && {
          studentClassroom: {
            create: {
              classroomId,
            },
          },
        }),
      },
      include: {
        studentClassroom: {
          include: {
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Format response
    const studentData: StudentData = {
      id: newStudent.id,
      name: newStudent.name,
      email: newStudent.email,
      cefrLevel: newStudent.cefrLevel,
      xp: newStudent.xp,
      role: newStudent.role || "student",
      createdAt: newStudent.createdAt.toISOString().split("T")[0],
      className: newStudent.studentClassroom[0]?.classroom.name || null,
      classroomId: newStudent.studentClassroom[0]?.classroom.id || null,
    };

    console.log("Student Model: Successfully created student:", studentData.id);
    return { success: true, student: studentData };
  } catch (error) {
    console.error("Student Model: Error creating student:", error);
    return { success: false, error: "Failed to create student" };
  }
};

// Update student
export const updateStudent = async (
  id: string,
  updateData: UpdateStudentInput,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; student?: StudentData; error?: string }> => {
  try {
    console.log("Student Model: Updating student:", id);

    // Build where clause based on user's permissions
    let whereClause: any = {
      id,
      roles: {
        some: {
          role: {
            name: "student",
          },
        },
      },
    };

    // If user is school admin, only allow updates to students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      userWithRoles.role !== "system"
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
    }

    // Check if student exists and user has permission to update
    const existingStudent = await prisma.user.findFirst({
      where: whereClause,
    });

    if (!existingStudent) {
      console.log("Student Model: Student not found or no permission:", id);
      return { success: false, error: "Student not found" };
    }

    // Check if email is being updated and doesn't conflict
    if (updateData.email && updateData.email !== existingStudent.email) {
      const normalizedEmail = updateData.email.toLowerCase().trim();
      const emailExists = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (emailExists) {
        console.log("Student Model: Email already in use:", updateData.email);
        return { success: false, error: "Email already in use" };
      }
    }

    // Validate classroom if being updated
    if (updateData.classroomId) {
      const classroom = await prisma.classroom.findFirst({
        where: {
          id: updateData.classroomId,
          ...(userWithRoles.schoolId &&
            userWithRoles.SchoolAdmins.length > 0 && {
              schoolId: userWithRoles.schoolId,
            }),
        },
      });

      if (!classroom) {
        console.log(
          "Student Model: Invalid classroom specified:",
          updateData.classroomId,
        );
        return { success: false, error: "Invalid classroom specified" };
      }
    }

    // Prepare update data
    const updatePayload: any = {};
    if (updateData.name) updatePayload.name = updateData.name;
    if (updateData.email)
      updatePayload.email = updateData.email.toLowerCase().trim();
    if (updateData.cefrLevel) updatePayload.cefrLevel = updateData.cefrLevel;
    if (updateData.password) {
      updatePayload.password = await hashPassword(updateData.password);
    }

    // Update the student
    const updatedStudent = await prisma.user.update({
      where: { id },
      data: updatePayload,
      include: {
        studentClassroom: {
          include: {
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Handle classroom update if specified
    if (updateData.classroomId !== undefined) {
      // Remove existing classroom relationships
      await prisma.classroomStudent.deleteMany({
        where: { studentId: id },
      });

      // Add new classroom relationship if classroomId is provided
      if (updateData.classroomId) {
        await prisma.classroomStudent.create({
          data: {
            studentId: id,
            classroomId: updateData.classroomId,
          },
        });
      }

      // Refetch to get updated classroom info
      const finalStudent = await prisma.user.findUnique({
        where: { id },
        include: {
          studentClassroom: {
            include: {
              classroom: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (finalStudent) {
        // Format response with updated classroom info
        const studentData: StudentData = {
          id: finalStudent.id,
          name: finalStudent.name,
          email: finalStudent.email,
          cefrLevel: finalStudent.cefrLevel,
          xp: finalStudent.xp,
          role: finalStudent.role || "student",
          createdAt: finalStudent.createdAt.toISOString().split("T")[0],
          className: finalStudent.studentClassroom[0]?.classroom.name || null,
          classroomId: finalStudent.studentClassroom[0]?.classroom.id || null,
        };

        console.log(
          "Student Model: Successfully updated student:",
          studentData.id,
        );
        return { success: true, student: studentData };
      }
    }

    // Format response for updates without classroom changes
    const studentData: StudentData = {
      id: updatedStudent.id,
      name: updatedStudent.name,
      email: updatedStudent.email,
      cefrLevel: updatedStudent.cefrLevel,
      xp: updatedStudent.xp,
      role: updatedStudent.role || "student",
      createdAt: updatedStudent.createdAt.toISOString().split("T")[0],
      className: updatedStudent.studentClassroom[0]?.classroom.name || null,
      classroomId: updatedStudent.studentClassroom[0]?.classroom.id || null,
    };

    console.log("Student Model: Successfully updated student:", studentData.id);
    return { success: true, student: studentData };
  } catch (error) {
    console.error("Student Model: Error updating student:", error);
    return { success: false, error: "Failed to update student" };
  }
};

// Delete student
export const deleteStudent = async (
  id: string,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Student Model: Deleting student:", id);

    // Build where clause based on user's permissions
    let whereClause: any = {
      id,
      role: "student",
    };

    // If user is school admin, only allow deletion of students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      userWithRoles.role !== "system"
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
    }

    // Check if student exists and user has permission to delete
    const existingStudent = await prisma.user.findFirst({
      where: whereClause,
    });

    if (!existingStudent) {
      console.log("Student Model: Student not found or no permission:", id);
      return { success: false, error: "Student not found" };
    }

    await prisma.classroomStudent.deleteMany({
      where: { studentId: id },
    });

    await prisma.userActivity.deleteMany({
      where: { userId: id },
    });

    await prisma.xPLogs.deleteMany({
      where: { userId: id },
    });

    // Delete the student
    await prisma.user.delete({
      where: { id },
    });

    console.log("Student Model: Successfully deleted student:", id);
    return { success: true };
  } catch (error) {
    console.error("Student Model: Error deleting student:", error);
    return { success: false, error: "Failed to delete student" };
  }
};

// Get student statistics
export const getStudentStatistics = async (userWithRoles: UserWithRoles) => {
  try {
    // Build where clause based on user's permissions
    let whereClause: any = {
      role: "student",
    };

    // If user is school admin, only show students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      userWithRoles.role !== "system"
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
    }

    // Calculate statistics
    const allStudentsForStats = await prisma.user.findMany({
      where: whereClause,
      select: {
        xp: true,
        cefrLevel: true,
        createdAt: true,
        userActivity: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          select: {
            userId: true,
          },
        },
      },
    });

    const totalStudents = allStudentsForStats.length;
    const averageXp =
      totalStudents > 0
        ? Math.round(
            allStudentsForStats.reduce((sum, student) => sum + student.xp, 0) /
              totalStudents,
          )
        : 0;

    // Calculate most common CEFR level
    const levelCounts = allStudentsForStats.reduce(
      (acc, student) => {
        const level = student.cefrLevel || "A0-";
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostCommonLevel =
      Object.entries(levelCounts).reduce((a, b) =>
        levelCounts[a[0]] > levelCounts[b[0]] ? a : b,
      )?.[0] || "A0-";

    // Calculate active users this week
    const activeUserIds = new Set(
      allStudentsForStats.flatMap((student) =>
        student.userActivity.map((activity) => activity.userId),
      ),
    );
    const activeThisWeek = activeUserIds.size;
    const activePercentage =
      totalStudents > 0
        ? Math.round((activeThisWeek / totalStudents) * 100)
        : 0;

    const statistics = {
      totalStudents,
      averageXp,
      mostCommonLevel,
      activeThisWeek,
      activePercentage,
    };

    return statistics;
  } catch (error) {
    console.error("Student Model: Error calculating statistics:", error);
    throw error;
  }
};

export const getStudentDashboardModel = async (userId: string) => {
  try {
    const startDate = startOfDay(subYears(new Date(), 1));

    return {};
  } catch (error) {
    console.error("[Controller] getVelocityMetrics - Error:", error);

    throw error;
  }
};

// Genre Engagement Types
export interface GenreEngagementData {
  genre: string;
  cefrBucket: string;
  totalReads: number;
  recentReads30d: number;
  recentReads7d: number;
  totalQuizCompletions: number;
  recentQuizCompletions30d: number;
  totalXpEarned: number;
  recentXp30d: number;
  weightedEngagementScore: number;
  lastActivityDate: Date;
  firstActivityDate: Date;
  activeDays: number;
  totalActivities: number;
  dailyActivityRate: number;
}

export interface GenreRecommendation {
  genre: string;
  rationale: string;
  confidenceScore: number;
  cefrAppropriate: boolean;
  adjacencyWeight: number;
  recommendationType:
    | "high_engagement_similar"
    | "underexplored_adjacent"
    | "level_appropriate_new";
}

export interface GenreMetricsResponse {
  scope: "student" | "class" | "school";
  scopeId: string;
  timeframe: string;
  topGenres: GenreEngagementData[];
  recommendations: GenreRecommendation[];
  cefrDistribution: Record<string, number>;
  totalEngagementScore: number;
  calculatedAt: Date;
}

/**
 * Get genre engagement metrics for a student
 * Analyzes reading patterns across genres with CEFR level consideration
 */
export async function getGenreEngagementMetrics(
  userId: string,
): Promise<GenreMetricsResponse | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        cefrLevel: true,
      },
    });

    if (!user) {
      console.log(
        "[Model] getGenreEngagementMetrics - User not found:",
        userId,
      );
      return null;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all article activity logs with article details
    const articleLogs = await prisma.articleActivityLog.findMany({
      where: {
        userId,
        isRead: true,
      },
      include: {
        article: {
          select: {
            genre: true,
            cefrLevel: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (articleLogs.length === 0) {
      return {
        scope: "student",
        scopeId: userId,
        timeframe: "30d",
        topGenres: [],
        recommendations: [],
        cefrDistribution: {},
        totalEngagementScore: 0,
        calculatedAt: now,
      };
    }

    // Group by genre and calculate metrics
    const genreMap = new Map<
      string,
      {
        reads: Array<{ date: Date; cefrLevel: string }>;
        quizCompletions: number;
        recentQuizCompletions30d: number;
        xpEarned: number;
        recentXp30d: number;
      }
    >();

    // Process article logs
    for (const log of articleLogs) {
      const genre = log.article.genre;
      const cefrLevel = log.article.cefrLevel;

      if (!genreMap.has(genre)) {
        genreMap.set(genre, {
          reads: [],
          quizCompletions: 0,
          recentQuizCompletions30d: 0,
          xpEarned: 0,
          recentXp30d: 0,
        });
      }

      const genreData = genreMap.get(genre)!;
      genreData.reads.push({
        date: log.createdAt,
        cefrLevel,
      });

      // Count quiz completions
      if (
        log.isMultipleChoiceQuestionCompleted ||
        log.isShortAnswerQuestionCompleted ||
        log.isLongAnswerQuestionCompleted
      ) {
        genreData.quizCompletions++;
        if (log.createdAt >= thirtyDaysAgo) {
          genreData.recentQuizCompletions30d++;
        }
      }
    }

    // Fetch XP logs for genre-related activities
    const xpLogs = await prisma.xPLogs.findMany({
      where: {
        userId,
        activityType: {
          in: [
            "ARTICLE_READ",
            "ARTICLE_RATING",
            "MC_QUESTION",
            "SA_QUESTION",
            "LA_QUESTION",
          ],
        },
      },
      select: {
        xpEarned: true,
        createdAt: true,
        activityId: true,
      },
    });

    // Map XP to genres (this is approximate - we match by timing)
    const articleIdToGenre = new Map<string, string>();
    articleLogs.forEach((log) => {
      articleIdToGenre.set(log.articleId, log.article.genre);
    });

    // Distribute XP to genres
    for (const xpLog of xpLogs) {
      if (xpLog.activityId) {
        const genre = articleIdToGenre.get(xpLog.activityId);
        if (genre && genreMap.has(genre)) {
          const genreData = genreMap.get(genre)!;
          genreData.xpEarned += xpLog.xpEarned;
          if (xpLog.createdAt >= thirtyDaysAgo) {
            genreData.recentXp30d += xpLog.xpEarned;
          }
        }
      }
    }

    // Calculate engagement data for each genre
    const topGenres: GenreEngagementData[] = [];
    const cefrDistribution: Record<string, number> = {};

    for (const [genre, data] of genreMap.entries()) {
      const reads = data.reads;
      const totalReads = reads.length;
      const recentReads30d = reads.filter(
        (r) => r.date >= thirtyDaysAgo,
      ).length;
      const recentReads7d = reads.filter((r) => r.date >= sevenDaysAgo).length;

      // Get unique active days
      const uniqueDays = new Set(
        reads.map((r) => r.date.toISOString().split("T")[0]),
      );
      const activeDays = uniqueDays.size;

      // Calculate most common CEFR level for this genre
      const cefrCounts = new Map<string, number>();
      reads.forEach((r) => {
        cefrCounts.set(r.cefrLevel, (cefrCounts.get(r.cefrLevel) || 0) + 1);
      });
      const mostCommonCefr =
        Array.from(cefrCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "";

      // Update CEFR distribution
      cefrDistribution[mostCommonCefr] =
        (cefrDistribution[mostCommonCefr] || 0) + totalReads;

      // Calculate weighted engagement score
      // Factors: recency, frequency, quiz completion, XP earned
      const recencyScore = recentReads7d * 3 + recentReads30d * 1;
      const frequencyScore = totalReads;
      const quizScore = data.quizCompletions * 2;
      const xpScore = data.xpEarned / 100;

      const weightedEngagementScore =
        recencyScore + frequencyScore + quizScore + xpScore;

      const firstActivity = reads[0].date;
      const lastActivity = reads[reads.length - 1].date;
      const daysSinceFirst = Math.max(
        1,
        (lastActivity.getTime() - firstActivity.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const dailyActivityRate = activeDays / daysSinceFirst;

      topGenres.push({
        genre,
        cefrBucket: mostCommonCefr,
        totalReads,
        recentReads30d,
        recentReads7d,
        totalQuizCompletions: data.quizCompletions,
        recentQuizCompletions30d: data.recentQuizCompletions30d,
        totalXpEarned: data.xpEarned,
        recentXp30d: data.recentXp30d,
        weightedEngagementScore,
        lastActivityDate: lastActivity,
        firstActivityDate: firstActivity,
        activeDays,
        totalActivities: totalReads + data.quizCompletions,
        dailyActivityRate,
      });
    }

    // Sort by engagement score
    topGenres.sort(
      (a, b) => b.weightedEngagementScore - a.weightedEngagementScore,
    );

    // Calculate total engagement score
    const totalEngagementScore = topGenres.reduce(
      (sum, g) => sum + g.weightedEngagementScore,
      0,
    );

    // Generate recommendations
    const recommendations = await generateGenreRecommendations(
      user.cefrLevel || "A1",
      topGenres,
      genreMap,
    );

    return {
      scope: "student",
      scopeId: userId,
      timeframe: "30d",
      topGenres,
      recommendations,
      cefrDistribution,
      totalEngagementScore,
      calculatedAt: now,
    };
  } catch (error) {
    console.error("[Model] getGenreEngagementMetrics - Error:", error);
    throw error;
  }
}

/**
 * Generate genre recommendations based on current engagement patterns
 */
async function generateGenreRecommendations(
  userCefrLevel: string,
  topGenres: GenreEngagementData[],
  genreMap: Map<string, any>,
): Promise<GenreRecommendation[]> {
  try {
    const recommendations: GenreRecommendation[] = [];

    // Get all available genres from articles
    const allGenres = await prisma.article.findMany({
      select: {
        genre: true,
        cefrLevel: true,
      },
      distinct: ["genre"],
      where: {
        isPublished: true,
      },
    });

    const availableGenres = new Set(allGenres.map((a) => a.genre));
    const userGenres = new Set(topGenres.map((g) => g.genre));

    // Find unexplored genres
    const unexploredGenres = Array.from(availableGenres).filter(
      (g) => !userGenres.has(g),
    );

    // Recommendation 1: Similar to high engagement genres
    if (topGenres.length > 0) {
      const topGenre = topGenres[0];
      // Find level-appropriate similar genres
      const similarGenres = unexploredGenres.slice(0, 1);

      if (similarGenres.length > 0) {
        recommendations.push({
          genre: similarGenres[0],
          rationale: `Similar to your favorite genre "${topGenre.genre}" with ${topGenre.totalReads} reads`,
          confidenceScore: 0.85,
          cefrAppropriate: true,
          adjacencyWeight: 0.9,
          recommendationType: "high_engagement_similar",
        });
      }
    }

    // Recommendation 2: Level-appropriate unexplored genres
    const levelAppropriateGenres = unexploredGenres.slice(0, 2);
    for (const genre of levelAppropriateGenres) {
      if (recommendations.length < 3) {
        recommendations.push({
          genre,
          rationale: `New genre at your reading level (${userCefrLevel})`,
          confidenceScore: 0.7,
          cefrAppropriate: true,
          adjacencyWeight: 0.5,
          recommendationType: "level_appropriate_new",
        });
      }
    }

    // Recommendation 3: Adjacent genres to explored ones
    if (topGenres.length > 1 && recommendations.length < 3) {
      const adjacentGenre = unexploredGenres[0];
      if (adjacentGenre) {
        recommendations.push({
          genre: adjacentGenre,
          rationale: `Expand your reading variety beyond ${topGenres.length} genres`,
          confidenceScore: 0.6,
          cefrAppropriate: true,
          adjacencyWeight: 0.7,
          recommendationType: "underexplored_adjacent",
        });
      }
    }

    return recommendations.slice(0, 3);
  } catch (error) {
    console.error("[Model] generateGenreRecommendations - Error:", error);
    return [];
  }
}

/**
 * Calculate XP velocity metrics for a student
 * This includes 7-day and 30-day averages, EMA velocity, and ETA predictions
 */
export async function getVelocityMetrics(
  userId: string,
): Promise<VelocityMetrics | null> {
  try {
    // Fetch user with basic info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        schoolId: true,
        xp: true,
        level: true,
        cefrLevel: true,
      },
    });

    if (!user) {
      console.log("[Model] getVelocityMetrics - User not found:", userId);
      return null;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch XP logs for 7 and 30 days
    const [xpLogs7d, xpLogs30d, lastActivity] = await Promise.all([
      prisma.xPLogs.findMany({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          xpEarned: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.xPLogs.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          xpEarned: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.userActivity.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    // Calculate 7-day metrics
    const xpLast7d = xpLogs7d.reduce((sum, log) => sum + log.xpEarned, 0);
    const uniqueDays7d = new Set(
      xpLogs7d.map((log) => log.createdAt.toISOString().split("T")[0]),
    );
    const activeDays7d = uniqueDays7d.size;
    const xpPerActiveDay7d = activeDays7d > 0 ? xpLast7d / activeDays7d : 0;
    const xpPerCalendarDay7d = xpLast7d / 7;

    // Calculate 30-day metrics
    const xpLast30d = xpLogs30d.reduce((sum, log) => sum + log.xpEarned, 0);
    const uniqueDays30d = new Set(
      xpLogs30d.map((log) => log.createdAt.toISOString().split("T")[0]),
    );
    const activeDays30d = uniqueDays30d.size;
    const xpPerActiveDay30d = activeDays30d > 0 ? xpLast30d / activeDays30d : 0;
    const xpPerCalendarDay30d = xpLast30d / 30;

    // Calculate EMA velocity (Exponential Moving Average)
    // Using alpha = 2/(N+1) where N = 14 days for smoothing
    const alpha = 2 / 15;
    let emaVelocity = xpPerCalendarDay30d; // Start with 30-day average

    if (xpLogs30d.length > 0) {
      // Group by day and calculate daily XP
      const dailyXp = new Map<string, number>();
      xpLogs30d.forEach((log) => {
        const day = log.createdAt.toISOString().split("T")[0];
        dailyXp.set(day, (dailyXp.get(day) || 0) + log.xpEarned);
      });

      // Calculate EMA from daily values
      const sortedDays = Array.from(dailyXp.entries()).sort(([a], [b]) =>
        a.localeCompare(b),
      );
      sortedDays.forEach(([_, xp]) => {
        emaVelocity = alpha * xp + (1 - alpha) * emaVelocity;
      });
    }

    // Calculate standard deviation of daily XP
    const dailyXpValues = Array.from(
      xpLogs30d
        .reduce((map, log) => {
          const day = log.createdAt.toISOString().split("T")[0];
          map.set(day, (map.get(day) || 0) + log.xpEarned);
          return map;
        }, new Map<string, number>())
        .values(),
    );

    let stdDev = 0;
    if (dailyXpValues.length > 1) {
      const mean =
        dailyXpValues.reduce((a, b) => a + b, 0) / dailyXpValues.length;
      const variance =
        dailyXpValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        dailyXpValues.length;
      stdDev = Math.sqrt(variance);
    }

    // Calculate XP to next level (simple: 1000 XP per level)
    const nextLevelXp = user.level * 1000;
    const xpToNextLevel = Math.max(0, nextLevelXp - user.xp);

    // Calculate ETA to next level
    let etaDays: number | null = null;
    let etaDate: string | null = null;
    let etaConfidenceLow: number | null = null;
    let etaConfidenceHigh: number | null = null;

    if (emaVelocity > 0) {
      etaDays = Math.ceil(xpToNextLevel / emaVelocity);
      const etaDateObj = new Date(
        now.getTime() + etaDays * 24 * 60 * 60 * 1000,
      );
      etaDate = etaDateObj.toISOString().split("T")[0];

      // Calculate confidence interval (±1 std dev)
      const lowerVelocity = Math.max(0, emaVelocity - stdDev);
      const upperVelocity = emaVelocity + stdDev;

      if (upperVelocity > 0) {
        etaConfidenceLow = Math.ceil(xpToNextLevel / upperVelocity);
      }
      if (lowerVelocity > 0) {
        etaConfidenceHigh = Math.ceil(xpToNextLevel / lowerVelocity);
      }
    }

    // Determine signal quality and confidence band
    const isLowSignal = activeDays7d < 3;
    let confidenceBand: "high" | "medium" | "low" | "none";

    if (activeDays7d >= 5) confidenceBand = "high";
    else if (activeDays7d >= 3) confidenceBand = "medium";
    else if (activeDays7d >= 1) confidenceBand = "low";
    else confidenceBand = "none";

    return {
      userId: user.id,
      email: user.email || "",
      displayName: user.name,
      schoolId: user.schoolId,
      currentXp: user.xp,
      currentLevel: user.level,
      cefrLevel: user.cefrLevel || "",

      // 7-day metrics
      xpLast7d,
      activeDays7d,
      xpPerActiveDay7d,
      xpPerCalendarDay7d,

      // 30-day metrics
      xpLast30d,
      activeDays30d,
      xpPerActiveDay30d,
      xpPerCalendarDay30d,

      // EMA and velocity
      emaVelocity,
      stdDev,

      // Level progression
      xpToNextLevel,
      nextLevelXp,

      // ETA
      etaDays,
      etaDate,
      etaConfidenceLow,
      etaConfidenceHigh,

      // Metadata
      lastActivityAt: lastActivity?.createdAt || null,
      isLowSignal,
      confidenceBand,
    };
  } catch (error) {
    console.error("[Model] getVelocityMetrics - Error:", error);
    throw error;
  }
}

// ==================== Activity Timeline ====================

/**
 * Timeline event types
 */
export interface TimelineEvent {
  id: string;
  type: "assignment" | "srs" | "reading" | "practice";
  title: string;
  description?: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Activity timeline data structure
 */
export interface ActivityTimelineData {
  scope: "student";
  entityId: string;
  timeframe: string;
  timezone: string;
  events: TimelineEvent[];
  metadata: {
    totalEvents: number;
    eventTypes: Record<string, number>;
    dateRange: {
      start: string;
      end: string;
    };
  };
  cache: {
    cached: boolean;
    generatedAt: string;
  };
}

/**
 * Get activity timeline for a student
 * Fetches all activities (reading, assignments, SRS, practice) within a timeframe
 */
export const getActivityTimeline = async ({
  studentId,
  timeframe = "30d",
  timezone = "UTC",
}: {
  studentId: string;
  timeframe: "7d" | "30d" | "90d";
  timezone: string;
}): Promise<ActivityTimelineData | null> => {
  try {
    // Validate student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true },
    });

    if (!student) {
      return null;
    }

    // Calculate date range based on timeframe
    const now = new Date();
    let daysAgo = 30;
    if (timeframe === "7d") daysAgo = 7;
    else if (timeframe === "90d") daysAgo = 90;

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);

    // Fetch all activities in parallel
    const [
      userActivities,
      assignmentStudents,
      cardReviews,
      practiceActivities,
    ] = await Promise.all([
      // Reading activities
      prisma.userActivity.findMany({
        where: {
          userId: studentId,
          createdAt: {
            gte: startDate,
          },
          activityType: {
            in: ["ARTICLE_READ", "STORIES_READ", "STORIES_CHAPTER_READ"],
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Assignment activities
      prisma.assignmentStudent.findMany({
        where: {
          studentId,
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          assignment: {
            include: {
              article: {
                select: {
                  id: true,
                  title: true,
                  cefrLevel: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // SRS (Flashcard) activities
      prisma.cardReview.findMany({
        where: {
          reviewedAt: {
            gte: startDate,
          },
          card: {
            deck: {
              userId: studentId,
            },
          },
        },
        include: {
          card: {
            include: {
              deck: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { reviewedAt: "desc" },
      }),

      // Practice activities (from XP logs)
      prisma.xPLogs.findMany({
        where: {
          userId: studentId,
          createdAt: {
            gte: startDate,
          },
          activityType: {
            in: [
              "MC_QUESTION",
              "SA_QUESTION",
              "LA_QUESTION",
              "SENTENCE_FLASHCARDS",
              "SENTENCE_MATCHING",
              "SENTENCE_ORDERING",
              "VOCABULARY_FLASHCARDS",
              "VOCABULARY_MATCHING",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Transform activities into timeline events
    const events: TimelineEvent[] = [];

    // Fetch article details for reading activities
    const articleIds = userActivities
      .filter((activity) => activity.targetId)
      .map((activity) => activity.targetId!);

    const articles =
      articleIds.length > 0
        ? await prisma.article.findMany({
            where: {
              id: { in: articleIds },
            },
            select: {
              id: true,
              title: true,
              cefrLevel: true,
              genre: true,
              subGenre: true,
            },
          })
        : [];

    const articleMap = new Map(
      articles.map((article) => [article.id, article]),
    );

    // Process reading activities
    userActivities.forEach((activity) => {
      const article = activity.targetId
        ? articleMap.get(activity.targetId)
        : null;

      events.push({
        id: activity.id,
        type: "reading",
        title: article?.title || "Reading Activity",
        description: activity.completed
          ? "Completed reading article"
          : "Started reading article",
        timestamp: activity.createdAt.toISOString(),
        duration: activity.timer || undefined,
        metadata: {
          articleId: activity.targetId,
          completed: activity.completed,
          cefrLevel: article?.cefrLevel,
          genre: article?.genre,
          subGenre: article?.subGenre,
          activityType: activity.activityType,
        },
      });
    });

    // Process assignments
    assignmentStudents.forEach((assignmentStudent) => {
      const assignment = assignmentStudent.assignment;
      events.push({
        id: assignmentStudent.id,
        type: "assignment",
        title: assignment.article?.title || "Assignment",
        description: `Assignment ${assignmentStudent.status.toLowerCase().replace(/_/g, " ")}`,
        timestamp: assignmentStudent.createdAt.toISOString(),
        metadata: {
          articleId: assignment.articleId,
          status: assignmentStudent.status,
          cefrLevel: assignment.article?.cefrLevel,
          dueDate: assignment.dueDate?.toISOString(),
          completedAt: assignmentStudent.completedAt?.toISOString(),
        },
      });
    });

    // Process flashcard reviews
    cardReviews.forEach((review) => {
      events.push({
        id: review.id,
        type: "srs",
        title: review.card?.deck?.name || "Flashcard Review",
        description: `Reviewed ${review.card?.type.toLowerCase() || "flashcard"}`,
        timestamp: review.reviewedAt.toISOString(),
        duration: review.timeSpent || undefined,
        metadata: {
          cardId: review.cardId,
          rating: review.rating,
          cardType: review.card?.type,
          front: review.card?.word || review.card?.sentence,
        },
      });
    });

    // Process practice activities
    practiceActivities.forEach((log) => {
      events.push({
        id: log.id,
        type: "practice",
        title: log.activityType.replace(/_/g, " "),
        description: `Earned ${log.xpEarned} XP`,
        timestamp: log.createdAt.toISOString(),
        metadata: {
          activityType: log.activityType,
          xpEarned: log.xpEarned,
          activityId: log.activityId,
        },
      });
    });

    // Sort all events by timestamp (newest first)
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Calculate metadata
    const eventTypes: Record<string, number> = {
      assignment: 0,
      srs: 0,
      reading: 0,
      practice: 0,
    };

    events.forEach((event) => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });

    return {
      scope: "student",
      entityId: studentId,
      timeframe,
      timezone,
      events,
      metadata: {
        totalEvents: events.length,
        eventTypes,
        dateRange: {
          start: startDate.toISOString().split("T")[0],
          end: now.toISOString().split("T")[0],
        },
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("[Model] getActivityTimeline - Error:", error);
    throw error;
  }
};

// ============================================================
// SRS Health Metrics
// ============================================================

export interface SRSHealthData {
  userId: string;
  classroomId?: string;
  schoolId?: string;
  healthStatus: "healthy" | "moderate" | "overloaded" | "critical";
  metrics: {
    totalCards: number;
    dueToday: number;
    overdue: number;
    newCardsToday: number;
    reviewedToday: number;
    avgRetentionRate: number;
  };
  recommendations: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    reason: string;
  }>;
  quickActions: Array<{
    label: string;
    count: number;
    action: string;
  }>;
}

export const getSRSHealth = async (
  studentId: string,
): Promise<SRSHealthData | null> => {
  try {
    const now = new Date();
    const startOfToday = startOfDay(now);

    // Get user data with all flashcard decks and cards
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        FlashcardDeck: {
          include: {
            cards: {
              include: {
                reviews: {
                  orderBy: { reviewedAt: "desc" },
                  take: 5, // Last 5 reviews for retention calculation
                },
              },
            },
          },
        },
        studentClassroom: {
          include: {
            classroom: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Get all cards across all decks
    const allCards = user.FlashcardDeck.flatMap((deck: any) => deck.cards);

    if (allCards.length === 0) {
      // Return empty state if no cards
      return {
        userId: studentId,
        classroomId: user.studentClassroom[0]?.classroom.id,
        schoolId: user.schoolId || undefined,
        healthStatus: "healthy",
        metrics: {
          totalCards: 0,
          dueToday: 0,
          overdue: 0,
          newCardsToday: 0,
          reviewedToday: 0,
          avgRetentionRate: 0,
        },
        recommendations: [],
        quickActions: [],
      };
    }

    // Calculate metrics
    const totalCards = allCards.length;
    const dueCards = allCards.filter((card: any) => card.due <= now);
    const overdueCards = allCards.filter(
      (card: any) => card.due < startOfToday && card.state === "REVIEW",
    );
    const newCards = allCards.filter((card: any) => card.state === "NEW");

    // Get cards reviewed today
    const reviewedTodayCount = await prisma.cardReview.count({
      where: {
        card: {
          deckId: {
            in: user.FlashcardDeck.map((deck: any) => deck.id),
          },
        },
        reviewedAt: {
          gte: startOfToday,
        },
      },
    });

    // Calculate retention rate from recent reviews
    let avgRetentionRate = 0;
    const cardsWithReviews = allCards.filter(
      (card: any) => card.reviews && card.reviews.length > 0,
    );

    if (cardsWithReviews.length > 0) {
      const totalRetention = cardsWithReviews.reduce(
        (sum: number, card: any) => {
          const successfulReviews = card.reviews.filter(
            (review: any) => review.rating >= 3,
          ).length;
          const totalReviews = card.reviews.length;
          return (
            sum + (totalReviews > 0 ? successfulReviews / totalReviews : 0)
          );
        },
        0,
      );
      avgRetentionRate = totalRetention / cardsWithReviews.length;
    }

    const dueToday = dueCards.length;
    const overdue = overdueCards.length;

    // Determine health status
    let healthStatus: "healthy" | "moderate" | "overloaded" | "critical";
    if (overdue > 50 || dueToday > 100) {
      healthStatus = "critical";
    } else if (overdue > 20 || dueToday > 50) {
      healthStatus = "overloaded";
    } else if (overdue > 10 || dueToday > 30) {
      healthStatus = "moderate";
    } else {
      healthStatus = "healthy";
    }

    // Generate recommendations based on status
    const recommendations: Array<{
      action: string;
      priority: "high" | "medium" | "low";
      reason: string;
    }> = [];

    if (overdue > 0) {
      recommendations.push({
        action: "Review overdue cards",
        priority: overdue > 20 ? "high" : "medium",
        reason: `You have ${overdue} overdue cards that need review to maintain retention`,
      });
    }

    if (avgRetentionRate < 0.7 && cardsWithReviews.length > 10) {
      recommendations.push({
        action: "Focus on difficult cards",
        priority: "high",
        reason: `Your retention rate is ${(avgRetentionRate * 100).toFixed(0)}%. Consider reviewing challenging cards more frequently`,
      });
    }

    if (dueToday === 0 && newCards.length > 0) {
      recommendations.push({
        action: "Learn new cards",
        priority: "low",
        reason: `You have ${newCards.length} new cards ready to learn`,
      });
    }

    if (reviewedTodayCount === 0 && dueToday > 0) {
      recommendations.push({
        action: "Start your daily review",
        priority: "medium",
        reason: "You haven't reviewed any cards today. Consistency is key!",
      });
    }

    // Generate quick actions
    const quickActions: Array<{
      label: string;
      count: number;
      action: string;
    }> = [];

    if (dueToday > 0) {
      quickActions.push({
        label: "Review Due Cards",
        count: dueToday,
        action: "review_due",
      });
    }

    if (overdue > 0) {
      quickActions.push({
        label: "Review Overdue",
        count: overdue,
        action: "review_overdue",
      });
    }

    if (newCards.length > 0 && dueToday < 20) {
      quickActions.push({
        label: "Learn New Cards",
        count: Math.min(newCards.length, 10),
        action: "learn_new",
      });
    }

    return {
      userId: studentId,
      classroomId: user.studentClassroom[0]?.classroom.id,
      schoolId: user.schoolId || undefined,
      healthStatus,
      metrics: {
        totalCards,
        dueToday,
        overdue,
        newCardsToday: newCards.length,
        reviewedToday: reviewedTodayCount,
        avgRetentionRate,
      },
      recommendations: recommendations.slice(0, 3), // Limit to top 3
      quickActions: quickActions.slice(0, 3), // Limit to top 3
    };
  } catch (error) {
    console.error("[Model] getSRSHealth - Error:", error);
    throw error;
  }
};

export const getStudentGoalsModel = async (userId: string) => {
  try {
    // Sync progress from user activities before fetching goals
    await syncProgressFromActivities(userId);

    const goals = await prisma.learningGoal.findMany({
      where: {
        userId,
      },
      include: {
        milestones: {
          orderBy: {
            order: "asc",
          },
        },
        progressLogs: true,
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { targetDate: "asc" }],
    });

    const summary = await prisma.learningGoal.findMany({
      where: {
        userId,
      },
    });

    const totalGoals = summary.length;
    const activeGoals = summary.filter(
      (g) => g.status === GoalStatus.ACTIVE,
    ).length;
    const completedGoals = summary.filter(
      (g) => g.status === GoalStatus.COMPLETED,
    ).length;
    const pausedGoals = summary.filter(
      (g) => g.status === GoalStatus.PAUSED,
    ).length;

    // Calculate on-track goals
    let onTrackGoals = 0;
    let behindScheduleGoals = 0;

    for (const goal of summary.filter((g) => g.status === GoalStatus.ACTIVE)) {
      const progress = await calculateProgress(goal.id, userId);
      if (progress.isOnTrack) {
        onTrackGoals++;
      } else {
        behindScheduleGoals++;
      }
    }

    const completionRate =
      totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    return {
      goals,
      totalGoals,
      activeGoals,
      completedGoals,
      pausedGoals,
      onTrackGoals,
      behindScheduleGoals,
      completionRate,
    };
  } catch (error) {
    console.error("Error fetching goals:", error);
    throw new Error("Failed to fetch goals");
  }
};

const syncProgressFromActivities = async (userId: string) => {
  const activeGoals = await prisma.learningGoal.findMany({
    where: {
      userId,
      status: GoalStatus.ACTIVE,
    },
  });

  const now = new Date();

  for (const goal of activeGoals) {
    // Sync based on goal type
    switch (goal.goalType) {
      case GoalType.XP_DAILY: {
        // Calculate XP earned today (since start of day)
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const xpLogs = await prisma.xPLogs.findMany({
          where: {
            userId,
            createdAt: {
              gte: todayStart,
              lte: now,
            },
          },
          select: {
            xpEarned: true,
          },
        });

        const dailyXp = xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);

        await prisma.learningGoal.update({
          where: { id: goal.id },
          data: {
            currentValue: dailyXp,
            // Auto-complete if target reached
            ...(dailyXp >= goal.targetValue && {
              status: GoalStatus.COMPLETED,
              completedAt: new Date(),
            }),
          },
        });
        break;
      }

      case GoalType.XP_WEEKLY: {
        // Calculate XP earned this week (last 7 days)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);

        const xpLogs = await prisma.xPLogs.findMany({
          where: {
            userId,
            createdAt: {
              gte: weekStart,
              lte: now,
            },
          },
          select: {
            xpEarned: true,
          },
        });

        const weeklyXp = xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);

        await prisma.learningGoal.update({
          where: { id: goal.id },
          data: {
            currentValue: weeklyXp,
            // Auto-complete if target reached
            ...(weeklyXp >= goal.targetValue && {
              status: GoalStatus.COMPLETED,
              completedAt: new Date(),
            }),
          },
        });
        break;
      }

      case GoalType.XP_TOTAL: {
        // Calculate XP earned since goal start date
        const xpLogs = await prisma.xPLogs.findMany({
          where: {
            userId,
            createdAt: {
              gte: goal.startDate,
              lte: now,
            },
          },
          select: {
            xpEarned: true,
          },
        });

        const totalXp = xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);

        await prisma.learningGoal.update({
          where: { id: goal.id },
          data: {
            currentValue: totalXp,
            // Auto-complete if target reached
            ...(totalXp >= goal.targetValue && {
              status: GoalStatus.COMPLETED,
              completedAt: new Date(),
            }),
          },
        });
        break;
      }

      case GoalType.ARTICLES_READ: {
        const articleCount = await prisma.assignmentStudent.count({
          where: {
            studentId: userId,
            status: { in: ["COMPLETED", "IN_PROGRESS"] },
            createdAt: {
              gte: goal.startDate,
              lte: now,
            },
          },
        });
        await prisma.learningGoal.update({
          where: { id: goal.id },
          data: {
            currentValue: articleCount,
            // Auto-complete if target reached
            ...(articleCount >= goal.targetValue && {
              status: GoalStatus.COMPLETED,
              completedAt: new Date(),
            }),
          },
        });
        break;
      }

      // Add more sync logic for other goal types
    }
  }
};

const calculateProgress = async (goalId: string, userId: string) => {
  const goal = await prisma.learningGoal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    include: {
      progressLogs: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!goal) {
    throw new Error("Goal not found");
  }

  const progressPercentage = Math.min(
    (goal.currentValue / goal.targetValue) * 100,
    100,
  );
  const remainingValue = Math.max(goal.targetValue - goal.currentValue, 0);

  const now = new Date();
  const daysRemaining = Math.max(
    Math.ceil(
      (goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    ),
    0,
  );

  const daysSinceStart = Math.max(
    Math.ceil(
      (now.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
    1,
  );

  const averageDailyProgress = goal.currentValue / daysSinceStart;

  const requiredDailyProgress =
    daysRemaining > 0 ? remainingValue / daysRemaining : 0;
  const isOnTrack =
    averageDailyProgress >= requiredDailyProgress ||
    goal.currentValue >= goal.targetValue;

  const estimatedDaysToComplete =
    averageDailyProgress > 0
      ? Math.ceil(remainingValue / averageDailyProgress)
      : daysRemaining;

  const estimatedCompletionDate = new Date(
    now.getTime() + estimatedDaysToComplete * 24 * 60 * 60 * 1000,
  );

  return {
    goalId: goal.id,
    progressPercentage,
    currentValue: goal.currentValue,
    targetValue: goal.targetValue,
    remainingValue,
    daysRemaining,
    averageDailyProgress,
    isOnTrack,
    estimatedCompletionDate,
  };
};

export const createStudentGoalsModel = async (
  goalData: CreateGoalInput,
  userId: string,
) => {
  try {
    const result = await prisma.learningGoal.create({
      data: {
        userId,
        goalType: goalData.goalType,
        title: goalData.title,
        description: goalData.description,
        targetValue: goalData.targetValue,
        unit: goalData.unit,
        targetDate: goalData.targetDate,
        priority: goalData.priority || GoalPriority.MEDIUM,
        isRecurring: goalData.isRecurring || false,
        recurringPeriod: goalData.recurringPeriod,
        metadata: goalData.metadata,
        milestones: goalData.milestones
          ? {
              create: goalData.milestones,
            }
          : undefined,
      },
      include: {
        milestones: true,
      },
    });

    return { success: true, goal: result };
  } catch {
    throw new Error("Failed to create learning goal");
  }
};

export const deleteStudentGoalsModel = async (
  goalId: string,
  userId: string,
) => {
  try {
    // Verify goal belongs to user
    const goal = await prisma.learningGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.userId !== userId) {
      throw new Error("Learning goal not found or access denied");
    }

    await prisma.learningGoal.delete({
      where: { id: goalId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting learning goal:", error);
    throw new Error("Failed to delete learning goal");
  }
};

export const updateStudentGoalsModel = async (
  goalId: string,
  goalData: UpdateGoalInput,
  userId: string,
) => {
  try {
    // Verify goal belongs to user
    const goal = await prisma.learningGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.userId !== userId) {
      throw new Error("Learning goal not found or access denied");
    }

    const result = await prisma.learningGoal.update({
      where: { id: goalId },
      data: {
        title: goalData.title,
        description: goalData.description,
        targetValue: goalData.targetValue,
        targetDate: goalData.targetDate,
        priority: goalData.priority,
        status: goalData.status,
        metadata: goalData.metadata,
      },
    });

    return { success: true, goal: result };
  } catch (error) {
    console.error("Error updating learning goal:", error);
    throw new Error("Failed to update learning goal");
  }
};
