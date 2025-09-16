import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeacherStatistics,
} from "@/server/models/teacherModel";
import { validateUser, checkAdminPermissions } from "@/server/utils/auth";
import {
  TeacherData,
  TeachersResponse,
  CreateTeacherInput,
  UpdateTeacherInput,
} from "@/types/index";

// GET Controller - Fetch teachers
export const getTeachersController = async (
  request: NextRequest,
): Promise<NextResponse<TeachersResponse | { error: string }>> => {
  try {
    console.log("Teacher Controller: Starting GET request...");

    const user = await currentUser();
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    console.log("Teacher Controller: Query params:", {
      page,
      limit,
      search,
      role,
    });

    // Get teachers data using model
    const { teachers, totalCount } = await getTeachers({
      page,
      limit,
      search,
      role,
      userWithRoles,
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

    console.log("Teacher Controller: Successfully fetched teachers");
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
  NextResponse<{ success: boolean; teacher?: TeacherData } | { error: string }>
> => {
  try {
    console.log("Teacher Controller: Starting POST request...");

    const user = await currentUser();
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
    const { name, email, role, cefrLevel, password, classroomIds } =
      body as CreateTeacherInput;

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
      cefrLevel: cefrLevel || "A1",
      password,
      classroomIds,
      userWithRoles,
    });

    if (!result.success) {
      const status =
        result.error === "User with this email already exists" ? 409 : 400;
      return NextResponse.json(
        { error: result.error || "Failed to create teacher" },
        { status },
      );
    }

    console.log(
      "Teacher Controller: Successfully created teacher:",
      result.teacher?.id,
    );
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
    console.log("Teacher Controller: Getting teacher by ID:", id);

    const user = await currentUser();
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

    console.log(
      "Teacher Controller: Successfully fetched teacher:",
      teacher.id,
    );
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
    console.log("Teacher Controller: Updating teacher:", id);

    const user = await currentUser();
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
    const updateData = body as UpdateTeacherInput;

    // Update teacher using model
    const result = await updateTeacher(id, updateData, userWithRoles);
    if (!result.success) {
      const status = result.error === "Teacher not found" ? 404 : 400;
      return NextResponse.json(
        { error: result.error || "Failed to update teacher" },
        { status },
      );
    }

    console.log(
      "Teacher Controller: Successfully updated teacher:",
      result.teacher?.id,
    );
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
    console.log("Teacher Controller: Deleting teacher:", id);

    const user = await currentUser();
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

    console.log("Teacher Controller: Successfully deleted teacher:", id);
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
