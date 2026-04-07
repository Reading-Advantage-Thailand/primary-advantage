import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { AssignmentStatus } from "@prisma/client";
import getAssignmentById, {
  createAssignment,
  getStudentAssignments,
  getUserLessonProgress,
  updateUserLessonProgress,
  getAssignmentActivityById,
} from "../models/assignmentModel";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/types/enum";

export async function fetchAssignments(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === Role.student) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classroomId = searchParams.get("classroomId");
    const articleId = searchParams.get("articleId");
    const assignmentId = searchParams.get("id");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Scope teachers to their own assignments only
    const teacherFilter = user.role === Role.teacher ? { teacherId: user.id } : {};

    if (articleId || assignmentId) {
      // Get assignment for specific article and classroom
      const assignment = await prisma.assignment.findFirst({
        where: {
          classroomId: classroomId || undefined,
          articleId: articleId || undefined,
          id: assignmentId || undefined,
          ...teacherFilter,
        },
        include: {
          article: {
            select: {
              title: true,
              summary: true,
            },
          },
          classroom: {
            select: {
              name: true,
            },
          },
          AssignmentStudent: {
            include: {
              student: {
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
      });

      if (!assignment) {
        return NextResponse.json({ meta: {}, students: [] }, { status: 200 });
      }

      // Get metadata from assignment
      const meta = {
        id: assignment.id,
        title: assignment.name,
        description: assignment.description,
        dueDate: assignment.dueDate,
        classroomId: assignment.classroomId,
        articleId: assignment.articleId,
        createdAt: assignment.createdAt,
        articleTitle: assignment.article.title,
      };

      const students = assignment.AssignmentStudent.map((sa) => ({
        id: sa.id,
        studentId: sa.studentId,
        status:
          sa.status === AssignmentStatus.NOT_STARTED
            ? 0
            : sa.status === AssignmentStatus.IN_PROGRESS
              ? 1
              : sa.status === AssignmentStatus.COMPLETED
                ? 2
                : 0,
        displayName: sa.student?.name,
      }));

      return NextResponse.json({ meta, students }, { status: 200 });
    } else {
      // Get all assignments for classroom
      let whereClause: any = {
        classroomId,
        ...teacherFilter,
      };

      if (search && search.trim() !== "") {
        const searchLower = search.toLowerCase().trim();
        whereClause.OR = [
          { name: { contains: searchLower, mode: "insensitive" } },
          { description: { contains: searchLower, mode: "insensitive" } },
        ];
      }

      const totalCount = await prisma.assignment.count({
        where: whereClause,
      });

      const assignments = await prisma.assignment.findMany({
        where: whereClause,
        include: {
          article: {
            select: {
              id: true,
              title: true,
              summary: true,
            },
          },
          AssignmentStudent: {
            include: {
              student: {
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
        skip: (page - 1) * limit,
        take: limit,
      });

      // Transform assignments to include student data
      const result = assignments.map((assignment) => ({
        articleId: assignment.articleId,
        meta: {
          id: assignment.id,
          title: assignment.name,
          description: assignment.description,
          dueDate: assignment.dueDate,
          classroomId: assignment.classroomId,
          articleId: assignment.articleId,
          createdAt: assignment.createdAt,
          articleTitle: assignment.article.title,
        },
        students: assignment.AssignmentStudent.map((sa) => ({
          id: sa.id,
          studentId: sa.studentId,
          status:
            sa.status === AssignmentStatus.NOT_STARTED
              ? 0
              : sa.status === AssignmentStatus.IN_PROGRESS
                ? 1
                : sa.status === AssignmentStatus.COMPLETED
                  ? 2
                  : 0,
          displayName: sa.student?.name,
        })),
        article: assignment.article,
      }));

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return NextResponse.json(
        {
          assignments: result,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit,
          },
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function postAssignment(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== Role.teacher && user.role !== Role.admin && user.role !== Role.system) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { classroomId, articleId, students, name, description, dueDate } =
      await req.json();

    // For teachers, verify they own the classroom
    if (user.role === Role.teacher) {
      const ownership = await prisma.classroomTeachers.findFirst({
        where: { classroomId, userId: user.id },
      });

      if (!ownership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    await createAssignment({
      classroomId,
      articleId,
      students,
      name,
      description,
      dueDate,
    });

    // // Get existing student assignments
    // const existingStudentIds = new Set(
    //   assignment.AssignmentStudent.map((sa) => sa.studentId),
    // );

    // // Filter out students who already have assignments
    // const newStudentIds = selectedStudents.filter(
    //   (studentId: string) => !existingStudentIds.has(studentId),
    // );

    // if (newStudentIds.length === 0) {
    //   return NextResponse.json(
    //     { message: "All students already have this assignment" },
    //     { status: 200 },
    //   );
    // }

    return NextResponse.json(
      { message: "Assignment created successfully" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message || "Internal server error" },
        { status: 500 },
      );
    }
  }
}

export async function fetchStudentAssignments(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const dueDateFilter = searchParams.get("dueDateFilter");
    const search = searchParams.get("search");

    const result = await getStudentAssignments({
      studentId: id,
      page,
      limit,
      status,
      dueDateFilter,
      search,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(
      "Student Controller: Error in fetchStudentAssignments:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function fetchAssignmentById(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const assignment = await getAssignmentById(id);

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Teachers may only access their own assignments
    if (user.role === Role.teacher && assignment.teacherId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(assignment, { status: 200 });
  } catch (error) {
    console.error("Error fetching assignment by ID:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function postUserLessonProgress(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: assignmentId } = await params;
    const { articleId, progress, timeSpent } = await request.json();

    await updateUserLessonProgress(
      user.id,
      assignmentId,
      articleId,
      progress,
      timeSpent,
    );

    return NextResponse.json(
      { message: "User lesson progress updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating assignment by ID:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function fetchUserLessonProgress(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: assignmentId } = await params;

    const userLessonProgress = await getUserLessonProgress(
      user.id,
      assignmentId,
    );

    return NextResponse.json({ userLessonProgress }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user lesson progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function fetchAssignmentActivityById(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const assignmentActivity = await getAssignmentActivityById(id, user.id);
    return NextResponse.json({ assignmentActivity }, { status: 200 });
  } catch (error) {
    console.error("Error fetching assignment activity by ID:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
