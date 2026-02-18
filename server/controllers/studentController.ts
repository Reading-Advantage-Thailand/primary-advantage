import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentStatistics,
  getStudentDashboardModel,
  getVelocityMetrics,
  VelocityMetrics,
  getGenreEngagementMetrics,
  GenreMetricsResponse,
  getActivityTimeline,
  ActivityTimelineData,
  getSRSHealth,
  SRSHealthData,
  getStudentGoalsModel,
  createStudentGoalsModel,
  deleteStudentGoalsModel,
  updateStudentGoalsModel,
} from "@/server/models/studentModel";
import { validateUser, checkAdminPermissions } from "@/server/utils/auth";
import {
  StudentData,
  StudentsResponse,
  CreateStudentInput,
  UpdateStudentInput,
} from "@/types/index";
import { CreateGoalInput, UpdateGoalInput } from "@/types/learning-goals";

// Type for student query parameters
interface StudentQueryParams {
  page: number;
  limit: number;
  search: string;
  classroomId: string;
  cefrLevel: string;
  userWithRoles: any;
}

// GET Controller - Fetch students
export const getStudentsController = async (
  request: NextRequest,
): Promise<NextResponse<StudentsResponse | { error: string }>> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission = await checkAdminPermissions(userWithRoles);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const classroomId = searchParams.get("classroomId") || "";
    const cefrLevel = searchParams.get("cefrLevel") || "";

    // Get students data using model
    const { students, totalCount } = await getStudents({
      page,
      limit,
      search,
      classroomId,
      cefrLevel,
      userWithRoles,
    });

    // Get statistics
    const statistics = await getStudentStatistics(userWithRoles);

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const pagination = {
      page,
      limit,
      total: totalCount,
      totalPages,
    };

    const response: StudentsResponse = {
      students,
      statistics,
      pagination,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Student Controller: Error in getStudentsController:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// POST Controller - Create student
export const createStudentController = async (
  request: NextRequest,
): Promise<
  NextResponse<{ success: boolean; student?: StudentData } | { error: string }>
> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission = await checkAdminPermissions(userWithRoles);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, email, cefrLevel, classroomId, password } =
      body as CreateStudentInput;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: "Missing required fields: name, email" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Create student using model
    const result = await createStudent({
      name,
      email,
      cefrLevel: cefrLevel || "A0-",
      classroomId,
      password,
      userWithRoles,
    });

    if (!result.success) {
      const status =
        result.error === "User with this email already exists" ? 409 : 400;
      return NextResponse.json(
        { error: result.error || "Internal server error" },
        { status },
      );
    }

    return NextResponse.json(
      { success: true, student: result.student },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Student Controller: Error in createStudentController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// GET by ID Controller - Fetch specific student
export const getStudentByIdController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<{ student: StudentData } | { error: string }>> => {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission = await checkAdminPermissions(userWithRoles);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Get student by ID using model
    const student = await getStudentById(id, userWithRoles);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ student }, { status: 200 });
  } catch (error) {
    console.error(
      "Student Controller: Error in getStudentByIdController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// PUT Controller - Update student
export const updateStudentController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<
  NextResponse<{ success: boolean; student?: StudentData } | { error: string }>
> => {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission = await checkAdminPermissions(userWithRoles);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const updateData = body as UpdateStudentInput;

    // Update student using model
    const result = await updateStudent(id, updateData, userWithRoles);
    if (!result.success) {
      const status = result.error === "Student not found" ? 404 : 400;
      return NextResponse.json(
        { error: result.error || "Internal server error" },
        { status },
      );
    }

    return NextResponse.json(
      { success: true, student: result.student },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Student Controller: Error in updateStudentController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// DELETE Controller - Delete student
export const deleteStudentController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<{ success: boolean } | { error: string }>> => {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission = await checkAdminPermissions(userWithRoles);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Delete student using model
    const result = await deleteStudent(id, userWithRoles);
    if (!result.success) {
      const status = result.error === "Student not found" ? 404 : 400;
      return NextResponse.json(
        { error: result.error || "Internal server error" },
        { status },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "Student Controller: Error in deleteStudentController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// GET Controller - Fetch student dashboard
export const getStudentDashboardController = async (userId: string) => {
  try {
    const dashboardData = await getStudentDashboardModel(userId);
    return dashboardData;
  } catch (error) {
    console.error(
      "Student Controller: Error in getStudentDashboardController:",
      error,
    );
    throw error;
  }
};

// GET Controller - Fetch student velocity metrics
export const getVelocityMetricsController = async (
  request: NextRequest,
): Promise<NextResponse<VelocityMetrics | { error: string }>> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get studentId from query params (for admins/teachers) or use current user
    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get("studentId");

    let targetUserId = user.id;

    // If requesting another student's data, check permissions
    if (requestedStudentId && requestedStudentId !== user.id) {
      const userWithRoles = await validateUser(user.id);
      if (!userWithRoles) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const hasPermission = await checkAdminPermissions(userWithRoles);
      if (!hasPermission) {
        return NextResponse.json(
          {
            error:
              "Forbidden - Insufficient permissions to view other students",
          },
          { status: 403 },
        );
      }

      targetUserId = requestedStudentId;
    }

    // Fetch velocity metrics
    const velocityMetrics = await getVelocityMetrics(targetUserId);

    if (!velocityMetrics) {
      return NextResponse.json(
        { error: "Student not found or no activity data" },
        { status: 404 },
      );
    }

    return NextResponse.json(velocityMetrics, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error(
      "Student Controller: Error in getVelocityMetricsController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// GET Controller - Fetch student genre engagement metrics
export const getGenreEngagementController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<GenreMetricsResponse | { error: string }>> => {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is requesting their own data or has permission to view others
    if (user.id !== id) {
      const userWithRoles = await validateUser(user.id);
      if (!userWithRoles) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const hasPermission = await checkAdminPermissions(userWithRoles);
      if (!hasPermission) {
        return NextResponse.json(
          {
            error:
              "Forbidden - Insufficient permissions to view other students",
          },
          { status: 403 },
        );
      }
    }

    // Fetch genre engagement metrics
    const genreMetrics = await getGenreEngagementMetrics(id);

    if (!genreMetrics) {
      return NextResponse.json(
        { error: "Student not found or no activity data" },
        { status: 404 },
      );
    }

    return NextResponse.json(genreMetrics, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=600", // Cache for 10 minutes
      },
    });
  } catch (error) {
    console.error(
      "Student Controller: Error in getGenreEngagementController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

/**
 * GET Controller - Fetch activity timeline for a student
 * Retrieves all activities (reading, assignments, SRS, practice) within a timeframe
 */
export const getActivityTimelineController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ActivityTimelineData | { error: string }>> => {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is requesting their own data or has permission to view others
    if (user.id !== id) {
      const userWithRoles = await validateUser(user.id);
      if (!userWithRoles) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const hasPermission = await checkAdminPermissions(userWithRoles);
      if (!hasPermission) {
        return NextResponse.json(
          {
            error:
              "Forbidden - Insufficient permissions to view other students",
          },
          { status: 403 },
        );
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get("timeframe") || "30d") as
      | "7d"
      | "30d"
      | "90d";
    const timezone = searchParams.get("timezone") || "UTC";

    // Fetch activity timeline
    const timelineData = await getActivityTimeline({
      studentId: id,
      timeframe,
      timezone,
    });

    if (!timelineData) {
      return NextResponse.json(
        { error: "Student not found or no activity data" },
        { status: 404 },
      );
    }

    return NextResponse.json(timelineData, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error(
      "Student Controller: Error in getActivityTimelineController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// GET Controller - Fetch SRS Health for a student
export const getSRSHealthController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: studentId } = await params;

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has permission to view this student's data
    const hasAdminPermission = await checkAdminPermissions(userWithRoles);
    const isOwnData = user.id === studentId;

    if (!hasAdminPermission && !isOwnData) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 },
      );
    }

    // Get SRS health data from model
    const srsHealth = await getSRSHealth(studentId);

    if (!srsHealth) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(srsHealth, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error(
      "Student Controller: Error in getSRSHealthController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

export const createStudentGoalController = async (
  body: CreateGoalInput,
  userId: string,
) => {
  // Placeholder implementation
  try {
    await createStudentGoalsModel(body, userId);
    return { success: true };
  } catch (error) {
    console.error(
      "Student Controller: Error in createStudentGoalController:",
      error,
    );
    throw new Error("Internal server error");
  }
};

export const deleteStudentGoalController = async (
  goalId: string,
  userId: string,
) => {
  try {
    await deleteStudentGoalsModel(goalId, userId);
    return { success: true };
  } catch (error) {
    console.error(
      "Student Controller: Error in deleteStudentGoalController:",
      error,
    );
    throw new Error("Internal server error");
  }
};

export const fetchStudentGoalController = async (userId: string) => {
  try {
    const goalsData = await getStudentGoalsModel(userId);
    return goalsData;
  } catch (error) {
    console.error(
      "Student Controller: Error in fetchStudentGoalController:",
      error,
    );
    throw new Error("Internal server error");
  }
};

export const updateStudentGoalController = async (
  goalId: string,
  updateData: UpdateGoalInput,
  userId: string,
) => {
  // Placeholder implementation
  try {
    // Implement update logic in the model as needed
    await updateStudentGoalsModel(goalId, updateData, userId);
    return { success: true };
  } catch (error) {
    console.error(
      "Student Controller: Error in updateStudentGoalController:",
      error,
    );
    throw new Error("Internal server error");
  }
};
