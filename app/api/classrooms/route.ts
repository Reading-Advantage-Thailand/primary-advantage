import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listClassroomsQuerySchema } from "@/lib/zod";

interface ClassroomData {
  id: string;
  name: string;
  grade: string | null;
  studentCount: number;
}

// GET /api/classrooms - Fetch classrooms for admin
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ClassroomData[] | { error: string }>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = listClassroomsQuerySchema.safeParse({
      schoolId: searchParams.get("schoolId") ?? undefined,
    });
    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryResult.error.flatten(),
        },
        { status: 400 },
      );
    }
    const { schoolId: requestedSchoolId } = queryResult.data;

    // Check if user has admin permissions
    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        SchoolAdmins: true,
      },
    });

    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin =
      userWithRoles.role === "admin" || userWithRoles.role === "system";

    if (!isAdmin && userWithRoles.SchoolAdmins.length === 0) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Build where clause based on user's permissions and requested schoolId.
    // System admins can filter to any school or see all (no filter when omitted).
    // Non-system admins: if they request a schoolId that differs from their own,
    // return empty rather than leaking foreign-school data (200 + [], consistent
    // with the teacher endpoint behaviour).
    let whereClause: any = {};

    if (userWithRoles.role === "system") {
      if (requestedSchoolId) {
        whereClause.schoolId = requestedSchoolId;
      }
      // else no filter — system sees all
    } else {
      // Non-system path
      if (requestedSchoolId && requestedSchoolId !== userWithRoles.schoolId) {
        // Cross-school request blocked — return empty without hitting the DB
        return NextResponse.json([], { status: 200 });
      }

      // Scope to the user's own school when applicable
      if (requestedSchoolId) {
        whereClause.schoolId = requestedSchoolId;
      } else if (userWithRoles.schoolId) {
        whereClause.schoolId = userWithRoles.schoolId;
      } else if (!isAdmin) {
        // Non-system admin without schoolId: no classrooms visible
        return NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 },
        );
      }
    }

    // Fetch classrooms with student count
    const classrooms = await prisma.classroom.findMany({
      where: whereClause,
      include: {
        students: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Transform data for response
    const classroomsData: ClassroomData[] = classrooms.map((classroom) => ({
      id: classroom.id,
      name: classroom.name,
      grade: classroom.grade,
      studentCount: classroom.students.filter(
        (cs) => cs.student.role === "student",
      ).length,
    }));

    return NextResponse.json(classroomsData);
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
