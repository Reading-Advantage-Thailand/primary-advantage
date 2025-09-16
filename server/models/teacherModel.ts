import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  TeacherData,
  CreateTeacherInput,
  UpdateTeacherInput,
  UserWithRoles,
} from "@/types/index";

// Type for teacher query parameters
interface TeacherQueryParams {
  page: number;
  limit: number;
  search: string;
  role: string;
  userWithRoles: UserWithRoles;
}

// Get teachers with pagination and filtering
export const getTeachers = async (
  params: TeacherQueryParams,
): Promise<{
  teachers: TeacherData[];
  totalCount: number;
}> => {
  const { page, limit, search, role, userWithRoles } = params;

  try {
    console.log("Teacher Model: Fetching teachers with params:", {
      page,
      limit,
      search,
      role,
    });

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      // School admin - only see teachers from their school
      schoolFilter = { schoolId: userWithRoles.schoolId };
      console.log(
        "Teacher Model: Filtering by school:",
        userWithRoles.schoolId,
      );
    }

    // Build the where clause for filtering
    const whereClause: any = {
      ...schoolFilter,
      roles: {
        some: {
          role: {
            name: {
              in: role ? [role] : ["Teacher", "Admin"],
            },
          },
        },
      },
    };

    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    console.log(
      "Teacher Model: Where clause:",
      JSON.stringify(whereClause, null, 2),
    );

    // Fetch teachers with pagination
    const [teachers, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          ClassroomTeachers: {
            include: {
              classroom: {
                include: {
                  students: true,
                },
              },
            },
          },
          School: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    console.log(
      `Teacher Model: Found ${teachers.length} teachers, total: ${totalCount}`,
    );

    // Transform data to match the expected interface
    const teachersData: TeacherData[] = teachers.map((teacher) => {
      // Get primary role (first role or most important one)
      const primaryRole =
        teacher.roles.find((r) => r.role.name === "Admin")?.role.name ||
        teacher.roles[0]?.role.name ||
        "Teacher";

      // Calculate total students across all classrooms
      const totalStudents = teacher.ClassroomTeachers.reduce((sum, ct) => {
        return sum + ct.classroom.students.length;
      }, 0);

      // Get total classes
      const totalClasses = teacher.ClassroomTeachers.length;

      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: primaryRole,
        createdAt: teacher.createdAt.toISOString(),
        image: teacher.image,
        schoolId: teacher.schoolId,
        cefrLevel: teacher.cefrLevel,
        totalStudents,
        totalClasses,
        assignedClassrooms: teacher.ClassroomTeachers.map((ct) => ({
          id: ct.classroom.id,
          name: ct.classroom.name,
          grade: ct.classroom.grade,
        })),
      };
    });

    return { teachers: teachersData, totalCount };
  } catch (error) {
    console.error("Teacher Model: Error fetching teachers:", error);
    throw error;
  }
};

// Get teacher by ID
export const getTeacherById = async (
  id: string,
  userWithRoles: UserWithRoles,
): Promise<TeacherData | null> => {
  try {
    console.log("Teacher Model: Fetching teacher by ID:", id);

    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolFilter = { schoolId: userWithRoles.schoolId };
    }

    const teacher = await prisma.user.findFirst({
      where: {
        id,
        ...schoolFilter,
        roles: {
          some: {
            role: {
              name: {
                in: ["Teacher", "Admin"],
              },
            },
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        ClassroomTeachers: {
          include: {
            classroom: {
              include: {
                students: true,
              },
            },
          },
        },
        School: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!teacher) {
      console.log("Teacher Model: Teacher not found:", id);
      return null;
    }

    // Transform data
    const primaryRole =
      teacher.roles.find((r) => r.role.name === "Admin")?.role.name ||
      teacher.roles[0]?.role.name ||
      "Teacher";

    const totalStudents = teacher.ClassroomTeachers.reduce((sum, ct) => {
      return sum + ct.classroom.students.length;
    }, 0);

    const totalClasses = teacher.ClassroomTeachers.length;

    const teacherData: TeacherData = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: primaryRole,
      createdAt: teacher.createdAt.toISOString(),
      image: teacher.image,
      schoolId: teacher.schoolId,
      cefrLevel: teacher.cefrLevel,
      totalStudents,
      totalClasses,
      assignedClassrooms: teacher.ClassroomTeachers.map((ct) => ({
        id: ct.classroom.id,
        name: ct.classroom.name,
        grade: ct.classroom.grade,
      })),
    };

    console.log("Teacher Model: Successfully fetched teacher:", teacherData.id);
    return teacherData;
  } catch (error) {
    console.error("Teacher Model: Error fetching teacher by ID:", error);
    throw error;
  }
};

// Create new teacher
export const createTeacher = async (params: {
  name: string;
  email: string;
  role: string;
  cefrLevel: string;
  password?: string;
  classroomIds?: string[];
  userWithRoles: UserWithRoles;
}): Promise<{ success: boolean; teacher?: TeacherData; error?: string }> => {
  const {
    name,
    email,
    role,
    cefrLevel,
    password,
    classroomIds,
    userWithRoles,
  } = params;

  try {
    console.log("Teacher Model: Creating teacher with email:", email);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("Teacher Model: User already exists with email:", email);
      return { success: false, error: "User with this email already exists" };
    }

    // Get the role ID
    const roleRecord = await prisma.role.findFirst({
      where: { name: role },
    });

    if (!roleRecord) {
      console.log("Teacher Model: Invalid role specified:", role);
      return { success: false, error: "Invalid role specified" };
    }

    // Determine school assignment
    let schoolId = null;
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolId = userWithRoles.schoolId;
    }

    // Generate password if not provided
    const hashedPassword = password
      ? bcrypt.hashSync(password, 10)
      : bcrypt.hashSync(Math.random().toString(36).slice(-8), 10);

    // Validate classroom IDs if provided
    if (classroomIds && classroomIds.length > 0) {
      const validClassrooms = await prisma.classroom.findMany({
        where: {
          id: { in: classroomIds },
          schoolId: schoolId, // Ensure classrooms belong to the same school
        },
      });

      if (validClassrooms.length !== classroomIds.length) {
        return {
          success: false,
          error: "Some classroom IDs are invalid or not accessible",
        };
      }
    }

    // Create the new teacher and assign classrooms in a transaction
    const newTeacher = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          cefrLevel,
          schoolId,
          roles: {
            create: {
              roleId: roleRecord.id,
            },
          },
        },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      // Assign to classrooms if provided
      if (classroomIds && classroomIds.length > 0) {
        await tx.classroomTeachers.createMany({
          data: classroomIds.map((classroomId) => ({
            classroomId,
            userId: user.id,
          })),
          skipDuplicates: true,
        });
      }

      // Fetch the complete teacher data with classroom relationships
      const completeTeacher = await tx.user.findUnique({
        where: { id: user.id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          ClassroomTeachers: {
            include: {
              classroom: {
                include: {
                  students: true,
                },
              },
            },
          },
        },
      });

      if (!completeTeacher) {
        throw new Error("Failed to fetch created teacher");
      }

      return completeTeacher;
    });

    // Calculate totals
    const totalStudents = newTeacher.ClassroomTeachers.reduce((sum, ct) => {
      return sum + ct.classroom.students.length;
    }, 0);
    const totalClasses = newTeacher.ClassroomTeachers.length;

    // Format response
    const teacherData: TeacherData = {
      id: newTeacher.id,
      name: newTeacher.name,
      email: newTeacher.email,
      role: newTeacher.roles[0]?.role.name || "Teacher",
      createdAt: newTeacher.createdAt.toISOString(),
      image: newTeacher.image,
      schoolId: newTeacher.schoolId,
      cefrLevel: newTeacher.cefrLevel,
      totalStudents,
      totalClasses,
      assignedClassrooms: newTeacher.ClassroomTeachers.map((ct) => ({
        id: ct.classroom.id,
        name: ct.classroom.name,
        grade: ct.classroom.grade,
      })),
    };

    console.log("Teacher Model: Successfully created teacher:", teacherData.id);
    return { success: true, teacher: teacherData };
  } catch (error) {
    console.error("Teacher Model: Error creating teacher:", error);
    return { success: false, error: "Failed to create teacher" };
  }
};

// Update teacher
export const updateTeacher = async (
  id: string,
  updateData: UpdateTeacherInput,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; teacher?: TeacherData; error?: string }> => {
  try {
    console.log("Teacher Model: Updating teacher:", id);

    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolFilter = { schoolId: userWithRoles.schoolId };
    }

    // Check if teacher exists and user has permission to update
    const existingTeacher = await prisma.user.findFirst({
      where: {
        id,
        ...schoolFilter,
        roles: {
          some: {
            role: {
              name: {
                in: ["Teacher", "Admin"],
              },
            },
          },
        },
      },
    });

    if (!existingTeacher) {
      console.log("Teacher Model: Teacher not found or no permission:", id);
      return { success: false, error: "Teacher not found" };
    }

    // Check if email is being updated and doesn't conflict
    if (updateData.email && updateData.email !== existingTeacher.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (emailExists) {
        console.log("Teacher Model: Email already in use:", updateData.email);
        return { success: false, error: "Email already in use" };
      }
    }

    // Validate classroom IDs if provided
    if (updateData.classroomIds) {
      const validClassrooms = await prisma.classroom.findMany({
        where: {
          id: { in: updateData.classroomIds },
          schoolId: existingTeacher.schoolId, // Ensure classrooms belong to the same school
        },
      });

      if (validClassrooms.length !== updateData.classroomIds.length) {
        return {
          success: false,
          error: "Some classroom IDs are invalid or not accessible",
        };
      }
    }

    // Prepare update data
    const updatePayload: any = {};
    if (updateData.name) updatePayload.name = updateData.name;
    if (updateData.email) updatePayload.email = updateData.email;
    if (updateData.cefrLevel) updatePayload.cefrLevel = updateData.cefrLevel;
    if (updateData.password) {
      updatePayload.password = bcrypt.hashSync(updateData.password, 10);
    }

    // Update the teacher and handle classroom assignments in a transaction
    const updatedTeacher = await prisma.$transaction(async (tx) => {
      // Update user data
      const user = await tx.user.update({
        where: { id },
        data: updatePayload,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      // Handle role update if specified
      if (updateData.role) {
        const roleRecord = await tx.role.findFirst({
          where: { name: updateData.role },
        });

        if (roleRecord) {
          // Remove existing roles and add new one
          await tx.userRole.deleteMany({
            where: { userId: id },
          });

          await tx.userRole.create({
            data: {
              userId: id,
              roleId: roleRecord.id,
            },
          });
        }
      }

      // Handle classroom assignments if specified
      if (updateData.classroomIds !== undefined) {
        // Remove existing classroom assignments
        await tx.classroomTeachers.deleteMany({
          where: { userId: id },
        });

        // Add new classroom assignments
        if (updateData.classroomIds.length > 0) {
          await tx.classroomTeachers.createMany({
            data: updateData.classroomIds.map((classroomId) => ({
              classroomId,
              userId: id,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Fetch the complete updated teacher data
      const completeTeacher = await tx.user.findUnique({
        where: { id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          ClassroomTeachers: {
            include: {
              classroom: {
                include: {
                  students: true,
                },
              },
            },
          },
        },
      });

      if (!completeTeacher) {
        throw new Error("Failed to fetch updated teacher");
      }

      return completeTeacher;
    });

    // Format response
    const primaryRole =
      updatedTeacher.roles.find((r) => r.role.name === "Admin")?.role.name ||
      updatedTeacher.roles[0]?.role.name ||
      "Teacher";

    const totalStudents = updatedTeacher.ClassroomTeachers.reduce((sum, ct) => {
      return sum + ct.classroom.students.length;
    }, 0);

    const totalClasses = updatedTeacher.ClassroomTeachers.length;

    const teacherData: TeacherData = {
      id: updatedTeacher.id,
      name: updatedTeacher.name,
      email: updatedTeacher.email,
      role: primaryRole,
      createdAt: updatedTeacher.createdAt.toISOString(),
      image: updatedTeacher.image,
      schoolId: updatedTeacher.schoolId,
      cefrLevel: updatedTeacher.cefrLevel,
      totalStudents,
      totalClasses,
      assignedClassrooms: updatedTeacher.ClassroomTeachers.map((ct) => ({
        id: ct.classroom.id,
        name: ct.classroom.name,
        grade: ct.classroom.grade,
      })),
    };

    console.log("Teacher Model: Successfully updated teacher:", teacherData.id);
    return { success: true, teacher: teacherData };
  } catch (error) {
    console.error("Teacher Model: Error updating teacher:", error);
    return { success: false, error: "Failed to update teacher" };
  }
};

// Delete teacher
export const deleteTeacher = async (
  id: string,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Teacher Model: Deleting teacher:", id);

    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolFilter = { schoolId: userWithRoles.schoolId };
    }

    // Check if teacher exists and user has permission to delete
    const existingTeacher = await prisma.user.findFirst({
      where: {
        id,
        ...schoolFilter,
        roles: {
          some: {
            role: {
              name: {
                in: ["Teacher", "Admin"],
              },
            },
          },
        },
      },
    });

    if (!existingTeacher) {
      console.log("Teacher Model: Teacher not found or no permission:", id);
      return { success: false, error: "Teacher not found" };
    }

    // Delete related records first
    await prisma.userRole.deleteMany({
      where: { userId: id },
    });

    await prisma.classroomTeachers.deleteMany({
      where: { userId: id },
    });

    // Delete the teacher
    await prisma.user.delete({
      where: { id },
    });

    console.log("Teacher Model: Successfully deleted teacher:", id);
    return { success: true };
  } catch (error) {
    console.error("Teacher Model: Error deleting teacher:", error);
    return { success: false, error: "Failed to delete teacher" };
  }
};

// Get teacher statistics
export const getTeacherStatistics = async (userWithRoles: UserWithRoles) => {
  try {
    console.log("Teacher Model: Calculating statistics");

    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolFilter = { schoolId: userWithRoles.schoolId };
    }

    const whereClause = {
      ...schoolFilter,
      roles: {
        some: {
          role: {
            name: {
              in: ["Teacher", "Admin"],
            },
          },
        },
      },
    };

    // Get all teachers for statistics
    const allTeachers = await prisma.user.findMany({
      where: whereClause,
      include: {
        ClassroomTeachers: {
          include: {
            classroom: {
              include: {
                students: true,
              },
            },
          },
        },
      },
    });

    const totalTeachers = allTeachers.length;

    // Calculate total students and classes
    let totalStudents = 0;
    let totalClasses = 0;
    let activeTeachers = 0;

    allTeachers.forEach((teacher) => {
      const teacherStudents = teacher.ClassroomTeachers.reduce((sum, ct) => {
        return sum + ct.classroom.students.length;
      }, 0);

      const teacherClasses = teacher.ClassroomTeachers.length;

      totalStudents += teacherStudents;
      totalClasses += teacherClasses;

      if (teacherClasses > 0) {
        activeTeachers++;
      }
    });

    const averageStudentsPerTeacher =
      totalTeachers > 0 ? Math.round(totalStudents / totalTeachers) : 0;

    const statistics = {
      totalTeachers,
      totalStudents,
      totalClasses,
      averageStudentsPerTeacher,
      activeTeachers,
    };

    console.log("Teacher Model: Statistics calculated:", statistics);
    return statistics;
  } catch (error) {
    console.error("Teacher Model: Error calculating statistics:", error);
    throw error;
  }
};
