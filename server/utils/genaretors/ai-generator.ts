import { prisma } from "@/lib/prisma";
import { generateText } from "ai";
import { openai, openaiModel } from "@/utils/openai";
import {
  AIInsightType,
  AIInsightPriority,
  AIInsightScope,
  AssignmentStatus,
} from "@prisma/client";

export interface GeneratedInsight {
  type: AIInsightType;
  priority: AIInsightPriority;
  title: {
    th: string;
    en: string;
    cn: string;
    tw: string;
    vi: string;
  };
  description: {
    th: string;
    en: string;
    cn: string;
    tw: string;
    vi: string;
  };
  confidence: number;
  data?: any;
  validUntil?: Date;
}

function parseAIResponse(
  response: string,
  scope: AIInsightScope,
  userId?: string,
  classroomId?: string,
  licenseId?: string,
): GeneratedInsight[] {
  try {
    // Extract JSON from response (in case AI added extra text)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Map AI types to valid AIInsightType enum values
    const normalizeType = (type: string): string => {
      const typeMap: Record<string, string> = {
        TREND: "TREND",
        ALERT: "ALERT",
        RECOMMENDATION: "RECOMMENDATION",
        ACHIEVEMENT: "ACHIEVEMENT",
        WARNING: "WARNING",
        // Map invalid types to valid ones
        ENGAGEMENT: "TREND",
        "LEARNING OPPORTUNITY": "RECOMMENDATION",
        OPPORTUNITY: "RECOMMENDATION",
        RISK: "WARNING",
        SUCCESS: "ACHIEVEMENT",
      };

      const normalized = typeMap[type?.toUpperCase()] || "RECOMMENDATION";
      return normalized;
    };

    // Map AI priorities to valid AIInsightPriority enum values
    const normalizePriority = (priority: string): string => {
      const priorityMap: Record<string, string> = {
        LOW: "LOW",
        MEDIUM: "MEDIUM",
        HIGH: "HIGH",
        CRITICAL: "CRITICAL",
      };

      return priorityMap[priority?.toUpperCase()] || "MEDIUM";
    };

    // Validate and transform
    const insights: GeneratedInsight[] = parsed
      .filter((item: any) => item.title && item.description)
      .map((item: any) => ({
        type: normalizeType(item.type),
        priority: normalizePriority(item.priority),
        title: item.title,
        description: item.description,
        confidence: Math.min(Math.max(item.confidence || 0.7, 0), 1),
        data: item.data || {},
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      }));

    return insights;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return [];
  }
}

function buildLicenseInsightPrompt(license: any, metrics: any): string {
  // - Max Users: ${metrics.maxUsers}
  // - License Utilization: ${(metrics.utilizationRate * 100).toFixed(0)}%
  // - Expires At: ${metrics.expiresAt}
  return `You are an AI assistant for school administrators analyzing your school's reading platform usage and performance metrics.

Your School: ${license.name || "School"}
- Total Users: ${metrics.totalUsers}
- Active Users (30 days): ${metrics.activeUsers}
- Engagement Rate: ${(metrics.engagementRate * 100).toFixed(0)}%
- Total XP Earned: ${metrics.totalXP}
- Recent XP (30 days): ${metrics.recentXP}

Generate 4-6 strategic insights as a JSON array focused ONLY on this school's performance:
[
  {
    "type": "TREND|ALERT|RECOMMENDATION|ACHIEVEMENT|WARNING",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "title": "Brief title (max 60 chars) with multi language support {th: 'ชื่อข้อคิดเห็น', en: 'Comment title', cn: 'Comment title', tw: 'Comment title', vi: 'Comment title'}",
    "description": "Strategic insight with specific metrics for this school (100-200 chars) with multi language support {th: 'คำอธิบายข้อคิดเห็น', en: 'Comment description', cn: 'Comment description', tw: 'Comment description', vi: 'Comment description'}",
    "confidence": 0.92,
    "data": {}
  }
]

Focus on:
1. This school's license utilization and efficiency
2. This school's engagement trends
3. ROI and effectiveness for this school
4. Actionable recommendations for this school's administrators
5. Areas where this school can improve

IMPORTANT: Do NOT mention or compare to other schools. Focus only on this school's data and performance.

Return ONLY the JSON array.`;
}

function calculateLicenseMetrics(school: any) {
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { users } = school;
  const totalUsers = school._count.users;

  const activeUsers = users.filter((u: any) => {
    const lastActivity = u.userActivity[0];
    return lastActivity && new Date(lastActivity.createdAt) > last30Days;
  }).length;

  const totalXP = users.reduce((sum: number, u: any) => sum + u.xp, 0);

  const recentXP = users.reduce((sum: number, u: any) => {
    const xp = u.XpLogs.filter(
      (x: any) => new Date(x.createdAt) > last30Days,
    ).reduce((s: number, x: any) => s + x.xpEarned, 0);
    return sum + xp;
  }, 0);

  return {
    totalUsers,
    activeUsers,
    // maxUsers: school.licenses[0].maxUsers,
    // utilizationRate:
    //   school.licenses[0].maxUsers > 0
    //     ? totalUsers / school.licenses[0].maxUsers
    //     : 0,
    engagementRate: totalUsers > 0 ? activeUsers / totalUsers : 0,
    totalXP,
    recentXP,
    // expiresAt: school.licenses[0].expiryDate,
  };
}

export async function generateSystemInsights(): Promise<GeneratedInsight[]> {
  try {
    // Fetch all licenses and aggregate data

    const licenses = await prisma.school.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
        users: {
          include: {
            XpLogs: true,
            userActivity: true,
          },
        },
      },
    });

    if (licenses.length === 0) {
      return generateFallbackSystemInsights();
    }

    // Calculate system-wide metrics
    const totalLicenses = licenses.length;
    const totalUsers = licenses.reduce(
      (sum, l) => sum + (l._count.users || 0),
      0,
    );
    // const totalCapacity = licenses.reduce((sum, l) => sum + l.maxUsers, 0);

    const activeUsers = licenses.reduce((sum, l) => {
      return (
        sum + (l.users.filter((u) => u.userActivity.length > 0).length || 0)
      );
    }, 0);

    const totalXP = licenses.reduce((sum, l) => {
      return (
        sum +
        (l.users.reduce((s, lu) => {
          return s + (lu.XpLogs.reduce((x, log) => x + log.xpEarned, 0) || 0);
        }, 0) || 0)
      );
    }, 0);

    // const utilizationRate = totalCapacity > 0 ? totalUsers / totalCapacity : 0;
    const engagementRate = totalUsers > 0 ? activeUsers / totalUsers : 0;

    // Build prompt for system-level insights
    // - Total Capacity: ${totalCapacity}
    // - Utilization Rate: ${(utilizationRate * 100).toFixed(1)}%
    const prompt = `You are an AI assistant for app administrators analyzing system-wide metrics across all schools.
  
  System Overview:
  - Total Schools: ${totalLicenses}
  - Total Users: ${totalUsers}
  - Active Users (30 days): ${activeUsers}
  - Engagement Rate: ${(engagementRate * 100).toFixed(1)}%
  - Total XP (30 days): ${totalXP}
  
  Top Schools by Activity:
  ${licenses
    .sort((a, b) => {
      const aXP = a.users.reduce(
        (s, u) => s + (u.XpLogs.reduce((x, log) => x + log.xpEarned, 0) || 0),
        0,
      );
      const bXP = b.users.reduce(
        (s, u) => s + (u.XpLogs.reduce((x, log) => x + log.xpEarned, 0) || 0),
        0,
      );
      return (bXP || 0) - (aXP || 0);
    })
    .slice(0, 5)
    .map(
      (l, i) =>
        `${i + 1}. ${l.name}: ${l._count.users} users, ${l.users.reduce((s, u) => s + (u.XpLogs.reduce((x, log) => x + log.xpEarned, 0) || 0), 0)} XP`,
    )
    .join("\n")}
  
  Generate 5-7 strategic system-wide insights as a JSON array:
  [
    {
      "type": "TREND|ALERT|RECOMMENDATION|ACHIEVEMENT|WARNING",
      "priority": "LOW|MEDIUM|HIGH|CRITICAL",
      "title": "Brief title (max 60 chars) with multi language support {th: 'ชื่อข้อคิดเห็น', en: 'Comment title', cn: 'Comment title', tw: 'Comment title', vi: 'Comment title'}",
      "description": "Strategic insight for app administrators (100-200 chars) with multi language support {th: 'คำอธิบายข้อคิดเห็น', en: 'Comment description', cn: 'Comment description', tw: 'Comment description', vi: 'Comment description'}",
      "confidence": 0.90,
      "data": {}
    }
  ]
  
  Focus on:
  1. Overall platform health and growth
  2. Schools needing support or attention
  3. System-wide engagement trends
  4. Capacity planning recommendations
  5. Platform expansion opportunities
  
  Return ONLY the JSON array.`;

    const { text } = await generateText({
      model: openai(openaiModel),
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const insights = parseAIResponse(text, "SYSTEM");

    return insights;
  } catch (error) {
    console.error("Error generating system insights:", error);
    return generateFallbackSystemInsights();
  }
}

function generateFallbackSystemInsights(): GeneratedInsight[] {
  return [
    {
      type: "RECOMMENDATION",
      priority: "MEDIUM",
      title: {
        th: "ตรวจสอบสถานะของระบบ",
        en: "Monitor system-wide engagement and performance across all schools.",
        cn: "监控系统整体参与和性能在所有学校中。",
        tw: "監控系統整體參與和性能在所有學校中。",
        vi: "Theo dõi sự tham gia và hiệu suất của hệ thống trên toàn bộ trường học trong toàn bộ trường học.",
      },
      description: {
        th: "ตรวจสอบสถานะของระบบ",
        en: "Monitor system-wide engagement and performance across all schools.",
        cn: "监控系统整体参与和性能在所有学校中。",
        tw: "監控系統整體參與和性能在所有學校中。",
        vi: "Theo dõi sự tham gia và hiệu suất của hệ thống trên toàn bộ trường học trong toàn bộ trường học.",
      },
      confidence: 0.75,
      data: "fallback",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

export async function generateLicenseInsights(
  licenseId: string,
): Promise<GeneratedInsight[]> {
  try {
    const school = await prisma.school.findUnique({
      where: { id: licenseId },
      include: {
        users: {
          include: {
            XpLogs: {
              take: 50,
              orderBy: { createdAt: "desc" },
            },
            userActivity: {
              take: 50,
              orderBy: { createdAt: "desc" },
            },
          },
        },
        licenses: {
          select: {
            maxUsers: true,
            expiryDate: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!school) {
      throw new Error("School not found");
    }

    const metrics = calculateLicenseMetrics(school);
    const prompt = buildLicenseInsightPrompt(school, metrics);

    const { text } = await generateText({
      model: openai(openaiModel),
      prompt,
      temperature: 0.7,
      maxTokens: 2500,
    });

    const insights = parseAIResponse(
      text,
      "LICENSE",
      undefined,
      undefined,
      licenseId,
    );

    return insights;
  } catch (error) {
    console.error("Error generating license insights:", error);
    return generateFallbackLicenseInsights(licenseId);
  }
}

function generateFallbackLicenseInsights(
  licenseId: string,
): GeneratedInsight[] {
  return [
    {
      type: "RECOMMENDATION",
      priority: "MEDIUM",
      title: {
        th: "ตรวจสอบการใช้งานสิทธิ์",
        en: "Monitor License Usage",
        cn: "监控许可证使用情况",
        tw: "監控許可證使用情況",
        vi: "Theo dõi việc sử dụng giấy phép",
      },
      description: {
        th: "ตรวจสอบการใช้งานสิทธิ์",
        en: "Track license utilization and engagement across your organization.",
        cn: "跟踪许可证使用情况和组织内的参与度。",
        tw: "追蹤許可證使用情況和組織內的參與度。",
        vi: "Theo dõi việc sử dụng giấy phép và tham gia trong tổ chức của bạn.",
      },
      confidence: 0.75,
      data: "fallback",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

export async function generateTeacherInsights(
  userId: string,
): Promise<GeneratedInsight[]> {
  try {
    // Fetch teacher data with classrooms and students
    const teacher = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ClassroomTeachers: {
          include: {
            classroom: {
              include: {
                students: {
                  include: {
                    student: {
                      include: {
                        userActivity: {
                          take: 10,
                          orderBy: { createdAt: "desc" },
                        },
                        AssignmentStudent: {
                          take: 10,
                          orderBy: { updatedAt: "desc" },
                        },
                      },
                    },
                  },
                },
                Assignment: {
                  include: {
                    AssignmentStudent: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new Error("Teacher not found");
    }

    if (teacher.ClassroomTeachers.length === 0) {
      return generateFallbackTeacherInsights(userId);
    }

    // Calculate metrics
    const metrics = calculateTeacherMetrics(teacher);

    // Generate insights using AI
    const prompt = buildTeacherInsightPrompt(teacher, metrics);

    const { text } = await generateText({
      model: openai(openaiModel),
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Parse AI response
    const insights = parseAIResponse(text, "TEACHER", userId);

    return insights;
  } catch (error) {
    console.error("Error generating teacher insights:", error);
    return generateFallbackTeacherInsights(userId);
  }
}

function calculateTeacherMetrics(teacher: any) {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const classrooms = teacher.ClassroomTeachers.map((tc: any) => tc.classroom);
  const totalStudents = classrooms.reduce(
    (sum: number, c: any) => sum + c.students.length,
    0,
  );

  const activeStudents = classrooms.reduce((sum: number, c: any) => {
    return (
      sum +
      c.students.filter((s: any) => {
        const lastActivity = s.student.userActivity[0];
        return lastActivity && new Date(lastActivity.createdAt) > last7Days;
      }).length
    );
  }, 0);

  const inactiveStudents = classrooms.reduce((sum: number, c: any) => {
    return (
      sum +
      c.students.filter((s: any) => {
        const lastActivity = s.student.userActivity[0];
        if (!lastActivity) return true;
        const daysSince = Math.floor(
          (now.getTime() - new Date(lastActivity.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return daysSince > 7;
      }).length
    );
  }, 0);

  const totalAssignments = classrooms.reduce(
    (sum: number, c: any) => sum + c.Assignment.length,
    0,
  );

  const pendingAssignments = classrooms.reduce((sum: number, c: any) => {
    return (
      sum +
      c.Assignment.filter((a: any) => {
        const pending = a.AssignmentStudent.filter(
          (sa: any) => sa.status !== AssignmentStatus.COMPLETED,
        );
        return pending.length > 0;
      }).length
    );
  }, 0);

  return {
    totalClasses: classrooms.length,
    totalStudents,
    activeStudents,
    inactiveStudents,
    engagementRate: totalStudents > 0 ? activeStudents / totalStudents : 0,
    totalAssignments,
    pendingAssignments,
  };
}

function generateFallbackTeacherInsights(userId: string): GeneratedInsight[] {
  return [
    {
      type: "RECOMMENDATION",
      priority: "MEDIUM",
      title: {
        th: "ตรวจสอบการใช้งานสิทธิ์",
        en: "Monitor your usage",
        cn: "监控许可证使用情况",
        tw: "監控許可證使用情況",
        vi: "Theo dõi việc sử dụng giấy phép",
      },
      description: {
        th: "ตรวจสอบการใช้งานของคุณ",
        en: "Track license utilization and engagement across your organization.",
        cn: "跟踪许可证使用情况和组织内的参与度。",
        tw: "追蹤許可證使用情況和組織內的參與度。",
        vi: "Theo dõi việc sử dụng giấy phép và tham gia trong tổ chức của bạn.",
      },
      confidence: 0.75,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

function buildTeacherInsightPrompt(teacher: any, metrics: any): string {
  return `You are an AI assistant for teachers analyzing classroom performance. Based on the data below, generate 4-6 actionable insights as a JSON array.

Teacher Profile:
- Name: ${teacher.name || "Teacher"}
- Total Classes: ${metrics.totalClasses}
- Total Students: ${metrics.totalStudents}

Engagement Metrics:
- Active students (7 days): ${metrics.activeStudents}
- Inactive students: ${metrics.inactiveStudents}
- Engagement rate: ${(metrics.engagementRate * 100).toFixed(0)}%

Assignment Metrics:
- Total assignments: ${metrics.totalAssignments}
- Pending assignments: ${metrics.pendingAssignments}

Generate insights in this JSON format:
[
  {
    "type": "TREND|ALERT|RECOMMENDATION|ACHIEVEMENT|WARNING",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "title": "Brief title (max 60 chars) with multi language support {th: 'ชื่อข้อคิดเห็น', en: 'Comment title', cn: 'Comment title', tw: 'Comment title', vi: 'Comment title'}",
    "description": "Specific, actionable insight with data (100-200 chars) with multi language support {th: 'คำอธิบายข้อคิดเห็น', en: 'Comment description', cn: 'Comment description', tw: 'Comment description', vi: 'Comment description'}",
    "confidence": 0.90,
    "data": {"studentCount": 5}
  }
]

Focus on:
1. Student engagement patterns
2. At-risk students requiring intervention
3. Assignment completion trends
4. Class performance comparisons
5. Recommended actions

Return ONLY the JSON array, no other text.`;
}

/**
 * Generate AI insights for a student
 */
export async function generateStudentInsights(
  userId: string,
): Promise<GeneratedInsight[]> {
  try {
    // Fetch student data
    const student = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userLessonProgress: {
          take: 50,
          orderBy: { createdAt: "desc" },
          include: {
            article: {
              select: {
                cefrLevel: true,
                genre: true,
                raLevel: true,
              },
            },
          },
        },
        userActivity: {
          take: 100,
          orderBy: { createdAt: "desc" },
        },
        AssignmentStudent: {
          take: 20,
          orderBy: { updatedAt: "desc" },
          include: {
            assignment: true,
          },
        },
        XpLogs: {
          take: 100,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!student) {
      throw new Error("Student not found");
    }

    // Calculate metrics
    const metrics = calculateStudentMetrics(student);

    // Generate insights using AI
    const prompt = buildStudentInsightPrompt(student, metrics);

    const { text } = await generateText({
      model: openai(openaiModel),
      prompt,
      temperature: 0.7,
      maxTokens: 1500,
    });

    // Parse AI response
    const insights = parseAIResponse(text, "STUDENT", userId);

    return insights;
  } catch (error) {
    console.error("Error generating student insights:", error);
    return generateFallbackStudentInsights(userId);
  }
}

/**
 * Fallback insights when AI is unavailable
 */
function generateFallbackStudentInsights(userId: string): GeneratedInsight[] {
  return [
    {
      type: "RECOMMENDATION",
      priority: "MEDIUM",
      title: {
        th: "อ่านทุกวัน",
        en: "Keep Reading Daily",
        cn: "每天阅读",
        tw: "每天閱讀",
        vi: "Đọc hằng ngày",
      },
      description: {
        th: "อ่านทุกวันเพื่อพัฒนาความเข้าใจและคำศัพท์",
        en: "Keep reading daily to improve comprehension and vocabulary.",
        cn: "每天阅读，提高阅读理解能力和词汇量。",
        tw: "每天閱讀，提高閱讀理解能力和詞彙量。",
        vi: "Đọc hằng ngày để cải thiện hiểu biết và từ vựng.",
      },
      confidence: 0.8,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

/**
 * Calculate student metrics for AI analysis
 */
function calculateStudentMetrics(student: any) {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentActivities = student.userActivity.filter(
    (a: any) => new Date(a.createdAt) > last7Days,
  );

  const recentLessons = student.userLessonProgress.filter(
    (l: any) => new Date(l.createdAt) > last7Days,
  );

  const recentXP = student.XpLogs.filter(
    (x: any) => new Date(x.createdAt) > last7Days,
  ).reduce((sum: number, x: any) => sum + x.xpEarned, 0);

  const totalXP = student.xp || 0;
  const currentLevel = student.level;
  const cefrLevel = student.cefrLevel;

  // Calculate reading velocity (articles per week)
  const articlesLast7Days = recentLessons.length;
  const articlesLast30Days = student.userLessonProgress.filter(
    (l: any) => new Date(l.createdAt) > last30Days,
  ).length;

  // Calculate genre diversity
  const genres = new Set(
    student.userLessonProgress
      .map((l: any) => l.article?.genre)
      .filter((g: any) => g),
  );

  // Assignment completion rate
  const totalAssignments = student.AssignmentStudent.length;
  const completedAssignments = student.AssignmentStudent.filter(
    (a: any) => a.status === "COMPLETED",
  ).length;
  const completionRate =
    totalAssignments > 0 ? completedAssignments / totalAssignments : 0;

  // Days since last activity
  const lastActivity = student.userActivity[0];
  const daysSinceLastActivity = lastActivity
    ? Math.floor(
        (now.getTime() - new Date(lastActivity.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 999;

  return {
    totalXP,
    currentLevel,
    cefrLevel,
    recentXP,
    articlesLast7Days,
    articlesLast30Days,
    readingVelocity: articlesLast7Days / 7,
    genreDiversity: genres.size,
    totalGenresRead: genres.size,
    completionRate,
    totalAssignments,
    completedAssignments,
    pendingAssignments: totalAssignments - completedAssignments,
    daysSinceLastActivity,
    // activeGoalsCount: student.learningGoals.length || 0,
    activeGoalsCount: 0,
  };
}

/**
 * Build prompt for student insights
 */
function buildStudentInsightPrompt(student: any, metrics: any): string {
  return `You are an AI learning coach analyzing a student's reading progress. Based on the data below, generate 3-5 personalized insights as a JSON array.

Student Profile:
- Name: ${student.name || "Student"}
- Current Level: ${metrics.currentLevel}
- CEFR Level: ${metrics.cefrLevel}
- Total XP: ${metrics.totalXP}
- Recent XP (7 days): ${metrics.recentXP}

Activity Metrics:
- Articles read (7 days): ${metrics.articlesLast7Days}
- Articles read (30 days): ${metrics.articlesLast30Days}
- Reading velocity: ${metrics.readingVelocity.toFixed(1)} articles/day
- Genre diversity: ${metrics.totalGenresRead} different genres
- Days since last activity: ${metrics.daysSinceLastActivity}

Assignment Performance:
- Total assignments: ${metrics.totalAssignments}
- Completed: ${metrics.completedAssignments}
- Completion rate: ${(metrics.completionRate * 100).toFixed(0)}%
- Pending: ${metrics.pendingAssignments}

Active Goals: ${metrics.activeGoalsCount}

Generate insights in this JSON format:
[
  {
    "type": "TREND|ALERT|RECOMMENDATION|ACHIEVEMENT|WARNING",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "title": "Brief title (max 60 chars) with multi language support {th: 'ชื่อข้อคิดเห็น', en: 'Comment title', cn: 'Comment title', tw: 'Comment title', vi: 'Comment title'}",
    "description": "Detailed insight with specific numbers and actionable advice (100-200 chars) with multi language support {th: 'คำอธิบายข้อคิดเห็น', en: 'Comment description', cn: 'Comment description', tw: 'Comment description', vi: 'Comment description'}",
    "confidence": 0.85,
    "data": {"key": "value"}
  }
]

Focus on:
1. Progress trends (positive or negative)
2. Engagement patterns
3. Learning opportunities
4. Areas needing attention
5. Achievements and milestones

Return ONLY the JSON array, no other text.`;
}

export async function generateClassroomInsights(
  classroomId: string,
): Promise<GeneratedInsight[]> {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        students: {
          include: {
            student: {
              include: {
                userActivity: {
                  take: 20,
                  orderBy: { createdAt: "desc" },
                },
                AssignmentStudent: {
                  take: 20,
                  orderBy: { createdAt: "desc" },
                },
              },
            },
          },
        },
        Assignment: {
          include: {
            AssignmentStudent: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const metrics = calculateClassroomMetrics(classroom);
    const prompt = buildClassroomInsightPrompt(classroom, metrics);

    const { text } = await generateText({
      model: openai(openaiModel),
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const insights = parseAIResponse(text, "CLASSROOM", undefined, classroomId);

    return insights;
  } catch (error) {
    console.error("Error generating classroom insights:", error);
    return generateFallbackClassroomInsights(classroomId);
  }
}

function calculateClassroomMetrics(classroom: any) {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const students = classroom.students.map((s: any) => s.student);
  const totalStudents = students.length;

  const activeStudents = students.filter((s: any) => {
    const lastActivity = s.userActivity[0];
    return lastActivity && new Date(lastActivity.createdAt) > last7Days;
  }).length;

  const averageLevel =
    students.reduce((sum: number, s: any) => sum + s.level, 0) /
      totalStudents || 0;

  const totalXP = students.reduce((sum: number, s: any) => sum + s.xp, 0);

  const strugglingStudents = students.filter((s: any) => {
    const assignments = s.AssignmentStudent;
    if (assignments.length < 3) return false;
    const recentAssignments = assignments.slice(0, 3);
    const avgScore =
      recentAssignments.reduce(
        (sum: number, a: any) => sum + (a.score || 0),
        0,
      ) / recentAssignments.length;
    return avgScore < 0.6;
  }).length;

  return {
    totalStudents,
    activeStudents,
    engagementRate: totalStudents > 0 ? activeStudents / totalStudents : 0,
    averageLevel,
    totalXP,
    strugglingStudents,
    totalAssignments: classroom.Assignment.length,
  };
}

function buildClassroomInsightPrompt(classroom: any, metrics: any): string {
  return `You are an AI assistant analyzing a specific classroom. Generate 3-5 insights as a JSON array.

Classroom: ${classroom.classroomName}
- Total Students: ${metrics.totalStudents}
- Active Students: ${metrics.activeStudents}
- Engagement Rate: ${(metrics.engagementRate * 100).toFixed(0)}%
- Average Level: ${metrics.averageLevel.toFixed(1)}
- Total XP: ${metrics.totalXP}
- Struggling Students: ${metrics.strugglingStudents}
- Total Assignments: ${metrics.totalAssignments}

Generate insights in this JSON format:
[
  {
    "type": "TREND|ALERT|RECOMMENDATION|ACHIEVEMENT|WARNING",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "title": "Brief title (max 60 chars) with multi language support {th: 'ชื่อข้อคิดเห็น', en: 'Comment title', cn: 'Comment title', tw: 'Comment title', vi: 'Comment title'}",
    "description": "Specific insight with data (100-200 chars) with multi language support {th: 'คำอธิบายข้อคิดเห็น', en: 'Comment description', cn: 'Comment description', tw: 'Comment description', vi: 'Comment description'}",
    "confidence": 0.88,
    "data": {}
  }
]

Focus on classroom-specific patterns and actionable recommendations.
Return ONLY the JSON array.`;
}

function generateFallbackClassroomInsights(
  classroomId: string,
): GeneratedInsight[] {
  return [
    {
      type: "RECOMMENDATION",
      priority: "MEDIUM",
      title: {
        th: "วิเคราะห์ผลการเรียนของนักเรียน",
        en: "Analyze Student Performance",
        cn: "分析学生表现",
        tw: "分析學生表現",
        vi: "Phân tích hiệu suất của học sinh",
      },
      description: {
        th: "วิเคราะห์ผลการเรียนของนักเรียนเพื่อระบุพื้นที่ที่ต้องปรับปรุง",
        en: "Analyze student performance to identify areas for improvement.",
        cn: "分析学生表现以确定需要改进的领域。",
        tw: "分析學生表現以確定需要改進的領域。",
        vi: "Phân tích hiệu suất của học sinh để xác định các lĩnh vực cần cải thiện.",
      },
      confidence: 0.75,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
}
