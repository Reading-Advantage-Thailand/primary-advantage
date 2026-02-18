import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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

    // Build where clause based on user's permissions
    let whereClause: any = {};

    // If user is school admin, only show classrooms from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      userWithRoles.role !== "system"
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
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
