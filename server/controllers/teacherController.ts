import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeacherStatistics,
  getTeachersDashboardModel,
  getTeacherClassReportModel,
  getClassroomHeatmapModel,
  createTeacherClassGoalModel,
  deleteTeacherClassGoalModel,
  getTeacherClassGoalsModel,
} from "@/server/models/teacherModel";
import { validateUser, checkAdminPermissions } from "@/server/utils/auth";
import {
  TeacherData,
  TeachersResponse,
  CreateTeacherInput,
} from "@/types/index";
import { CreateGoalInput } from "@/types/learning-goals";
import { listTeachersQuerySchema, updateTeacherInputSchema } from "@/lib/zod";

// GET Controller - Fetch teachers
export const getTeachersController = async (
  request: NextRequest,
): Promise<NextResponse<TeachersResponse | { error: string }>> => {
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const rawQuery = {
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      role: searchParams.get("role") ?? undefined,
      schoolId: searchParams.get("schoolId") ?? undefined,
    };

    const queryResult = listTeachersQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const {
      page: parsedPage,
      limit: parsedLimit,
      search,
      role,
      schoolId: requestedSchoolId,
    } = queryResult.data;

    const page = parsedPage ?? 1;
    const limit = parsedLimit ?? 50;

    // Apply role-based effective schoolId.
    // System admins can request any school or all (omit schoolId).
    // Non-system admins: if they request a schoolId that differs from their own,
    // return empty rather than leaking foreign-school data (200 + empty, consistent
    // with the classroom endpoint's implicit behaviour).
    let effectiveSchoolId: string | undefined;
    if (userWithRoles.role === "system") {
      effectiveSchoolId = requestedSchoolId;
    } else {
      if (requestedSchoolId && requestedSchoolId !== userWithRoles.schoolId) {
        // Cross-school request blocked — return empty response without hitting the DB
        const emptyResponse: TeachersResponse = {
          teachers: [],
          statistics: {
            totalTeachers: 0,
            totalStudents: 0,
            totalClasses: 0,
            averageStudentsPerTeacher: 0,
            activeTeachers: 0,
          },
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
        return NextResponse.json(emptyResponse, { status: 200 });
      }
      // Use the caller's own schoolId (may be null for platform-level admins without a school)
      effectiveSchoolId =
        requestedSchoolId ?? userWithRoles.schoolId ?? undefined;
    }

    // Get teachers data using model
    const { teachers, totalCount } = await getTeachers({
      page,
      limit,
      search: search ?? "",
      role: role ?? "",
      userWithRoles,
      schoolId: effectiveSchoolId,
    });

    // Get statistics
    const statistics = await getTeacherStatistics(userWithRoles);

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const pagination = {
      page,
      limit,
      total: totalCount,
      totalPages,
    };

    const response: TeachersResponse = {
      teachers,
      statistics,
      pagination,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Teacher Controller: Error in getTeachersController:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// POST Controller - Create teacher
export const createTeacherController = async (
  request: NextRequest,
): Promise<
  NextResponse<
    | { success: boolean; teacher?: TeacherData }
    | {
        error: string;
        requiresConfirmation?: boolean;
        existingSchool?: { id: string; name: string };
      }
  >
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
    const { name, email, role, password, classroomIds, force } =
      body as CreateTeacherInput & { force?: boolean };

    // Validate required fields
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, role" },
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

    // Create teacher using model
    const result = await createTeacher({
      name,
      email,
      role,
      password,
      classroomIds,
      userWithRoles,
      force: force || false,
    });

    if (!result.success) {
      // If confirmation is required, return special response
      if (result.requiresConfirmation) {
        return NextResponse.json(
          {
            error: result.error || "Teacher already belongs to a school",
            requiresConfirmation: true,
            existingSchool: result.existingSchool,
          },
          { status: 409 },
        );
      }

      const status = 400;
      return NextResponse.json(
        { error: result.error || "Failed to create teacher" },
        { status },
      );
    }

    return NextResponse.json(
      { success: true, teacher: result.teacher },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Teacher Controller: Error in createTeacherController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// GET by ID Controller - Fetch specific teacher
export const getTeacherByIdController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<{ teacher: TeacherData } | { error: string }>> => {
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

    // Get teacher by ID using model
    const teacher = await getTeacherById(id, userWithRoles);
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({ teacher }, { status: 200 });
  } catch (error) {
    console.error(
      "Teacher Controller: Error in getTeacherByIdController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// PUT Controller - Update teacher
export const updateTeacherController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<
  NextResponse<{ success: boolean; teacher?: TeacherData } | { error: string }>
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
    const parsed = updateTeacherInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update payload" },
        { status: 400 },
      );
    }
    const updateData = parsed.data;

    // School-change authz: only system admin may change a teacher's schoolId.
    // Checked here (early out) and again in the model (defense in depth).
    if (updateData.schoolId && userWithRoles.role !== "system") {
      return NextResponse.json(
        { error: "FORBIDDEN_SCHOOL_CHANGE" },
        { status: 403 },
      );
    }

    // Update teacher using model
    const result = await updateTeacher(id, updateData, userWithRoles);
    if (!result.success) {
      const statusMap: Record<string, number> = {
        "Teacher not found": 404,
        FORBIDDEN_SCHOOL_CHANGE: 403,
        CROSS_SCHOOL_CLASSROOM: 400,
      };
      const status = statusMap[result.error ?? ""] ?? 400;
      return NextResponse.json(
        { error: result.error || "Failed to update teacher" },
        { status },
      );
    }

    return NextResponse.json(
      { success: true, teacher: result.teacher },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Teacher Controller: Error in updateTeacherController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// DELETE Controller - Delete teacher
export const deleteTeacherController = async (
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

    // Delete teacher using model
    const result = await deleteTeacher(id, userWithRoles);
    if (!result.success) {
      const status = result.error === "Teacher not found" ? 404 : 400;
      return NextResponse.json(
        { error: result.error || "Failed to delete teacher" },
        { status },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "Teacher Controller: Error in deleteTeacherController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

export const fetchTeacherDashboardController = async (userId: string) => {
  try {
    const dashboardData = await getTeachersDashboardModel(userId);
    return dashboardData;
  } catch (error) {
    console.error(
      "Teacher Controller: Error in fetchTeacherDashboardController:",
      error,
    );
    throw error;
  }
};

export const fetchTeacherClassReportController = async (
  classroomId: string,
) => {
  try {
    const reportData = await getTeacherClassReportModel(classroomId);
    return reportData;
  } catch (error) {
    console.error(
      "Teacher Controller: Error in fetchTeacherClassReportController:",
      error,
    );
    throw error;
  }
};

export const fetchTeacherClassHeatMapController = async (
  classroomId: string,
  expanded: boolean,
) => {
  try {
    const heatmapData = await getClassroomHeatmapModel(classroomId, expanded);
    return heatmapData;
  } catch (error) {
    console.error(
      "Teacher Controller: Error in fetchTeacherClassHeatMapController:",
      error,
    );
    throw error;
  }
};

export const fetchTeacherClassGoalController = async (classroomId: string) => {
  try {
    const goalsData = await getTeacherClassGoalsModel(classroomId);
    return goalsData;
  } catch (error) {
    console.error(
      "Teacher Controller: Error in fetchTeacherClassGoalController:",
      error,
    );
    throw error;
  }
};

export const createTeacherClassGoalController = async (
  classroomId: string,
  goalData: CreateGoalInput,
) => {
  // Implementation for creating a class goal
  // This is a placeholder and should be implemented as per application logic
  try {
    // Call to model function to create class goal can be placed here
    const result = await createTeacherClassGoalModel(classroomId, goalData);
    return { success: true, result };
  } catch (error) {
    console.error(
      "Teacher Controller: Error in createTeacherClassGoalController:",
      error,
    );
    throw error;
  }
};

export const deleteTeacherClassGoalController = async (
  classroomId: string,
  student: any,
) => {
  // Implementation for creating a class goal
  // This is a placeholder and should be implemented as per application logic
  try {
    // Call to model function to create class goal can be placed here
    const result = await deleteTeacherClassGoalModel(classroomId, student);
    return { success: true, result };
  } catch (error) {
    console.error(
      "Teacher Controller: Error in deleteTeacherClassGoalController:",
      error,
    );
    throw error;
  }
};
