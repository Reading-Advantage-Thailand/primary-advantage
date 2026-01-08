import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  TeacherData,
  CreateTeacherInput,
  UpdateTeacherInput,
  UserWithRoles,
} from "@/types/index";
import {
  AssignmentMetrics,
  TeacherOverviewResponse,
  VelocityDataPoint,
  MetricsVelocityResponse,
  GenreMetrics,
  MetricsGenresResponse,
  MetricsActivityResponse,
  ActivityDataPoint,
  MetricsAlignmentResponse,
  AlignmentData,
  AlignmentBuckets,
  AlignmentSample,
} from "@/types/dashboard";
import { AssignmentStatus, ActivityType, GoalPriority } from "@prisma/client";
import { startOfDay, subDays, subYears } from "date-fns";
import { CreateGoalInput } from "@/types/learning-goals";

interface AlignmentMetricsRow {
  scope_id: string;
  scope_type: "school" | "classroom" | "student";
  user_id: string | null;
  display_name: string | null;
  email: string | null;
  classroom_id: string | null;
  student_ra_level: number | null;
  student_cefr_level: string | null;
  mapped_student_cefr_level: string | null;
  total_readings: number;
  below_count: number;
  aligned_count: number;
  above_count: number;
  unknown_count: number;
  below_pct: number;
  aligned_pct: number;
  above_pct: number;
  unknown_pct: number;
  below_samples: any[] | null;
  aligned_samples: any[] | null;
  above_samples: any[] | null;
  first_reading_at: Date | null;
  last_reading_at: Date | null;
  unique_articles: number;
  assigned_articles: number;
}

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
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      // School admin - only see teachers from their school
      schoolFilter = { schoolId: userWithRoles.schoolId };
    }

    // Build the where clause for filtering
    const whereClause: any = {
      ...schoolFilter,
      roles: {
        some: {
          role: {
            name: {
              in: role ? [role] : ["teacher", "admin"],
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

    // Transform data to match the expected interface
    const teachersData: TeacherData[] = teachers.map((teacher) => {
      // Get primary role (first role or most important one)
      const primaryRole =
        teacher.roles.find((r) => r.role.name === "admin")?.role.name ||
        teacher.roles[0]?.role.name ||
        "teacher";

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
                in: ["teacher", "admin"],
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
      return null;
    }

    // Transform data
    const primaryRole =
      teacher.roles.find((r) => r.role.name === "admin")?.role.name ||
      teacher.roles[0]?.role.name ||
      "teacher";

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
  password?: string;
  classroomIds?: string[];
  userWithRoles: UserWithRoles;
  force?: boolean; // If true, move teacher even if they have a school
}): Promise<{
  success: boolean;
  teacher?: TeacherData;
  error?: string;
  requiresConfirmation?: boolean;
  existingSchool?: { id: string; name: string };
}> => {
  const { name, email, role, password, classroomIds, userWithRoles, force } =
    params;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        School: {
          select: {
            id: true,
            name: true,
          },
        },
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Determine school assignment
    let schoolId = null;
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolId = userWithRoles.schoolId;
    }

    // If user exists, handle accordingly
    if (existingUser) {
      // Check if user has a school
      if (existingUser.schoolId && existingUser.School) {
        // If force is true, move the teacher to the new school
        if (force) {
          // Update the teacher to the new school
          return await updateExistingTeacherToSchool({
            existingUser,
            name,
            email,
            role,
            password,
            classroomIds,
            schoolId,
            userWithRoles,
          });
        } else {
          // Return confirmation required
          return {
            success: false,
            requiresConfirmation: true,
            existingSchool: {
              id: existingUser.School.id,
              name: existingUser.School.name,
            },
            error: "Teacher already belongs to a school",
          };
        }
      } else {
        // User exists but has no school - update them to the admin's school
        return await updateExistingTeacherToSchool({
          existingUser,
          name,
          email,
          role,
          password,
          classroomIds,
          schoolId,
          userWithRoles,
        });
      }
    }

    // Get the role ID
    const roleRecord = await prisma.role.findFirst({
      where: { name: role },
    });

    if (!roleRecord) {
      return { success: false, error: "Invalid role specified" };
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
      role: newTeacher.roles[0]?.role.name || "teacher",
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

    return { success: true, teacher: teacherData };
  } catch (error) {
    console.error("Teacher Model: Error creating teacher:", error);
    return { success: false, error: "Failed to create teacher" };
  }
};

// Helper function to update existing teacher to a new school
async function updateExistingTeacherToSchool(params: {
  existingUser: any;
  name: string;
  email: string;
  role: string;
  password?: string;
  classroomIds?: string[];
  schoolId: string | null;
  userWithRoles: UserWithRoles;
}): Promise<{
  success: boolean;
  teacher?: TeacherData;
  error?: string;
}> {
  const {
    existingUser,
    name,
    email,
    role,
    password,
    classroomIds,
    schoolId,
    userWithRoles,
  } = params;

  try {
    // Get the role ID
    const roleRecord = await prisma.role.findFirst({
      where: { name: role },
    });

    if (!roleRecord) {
      return { success: false, error: "Invalid role specified" };
    }

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

    // Update the existing teacher in a transaction
    const updatedTeacher = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData: any = {
        name,
        schoolId,
      };

      // Update password if provided
      if (password) {
        updateData.password = bcrypt.hashSync(password, 10);
      }

      // Update the user
      const user = await tx.user.update({
        where: { id: existingUser.id },
        data: updateData,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      // Check if user has the role, if not add it
      const hasRole = user.roles.some((r) => r.role.name === role);
      if (!hasRole) {
        // Get teacher and admin role IDs
        const teacherAdminRoles = await tx.role.findMany({
          where: {
            name: {
              in: ["teacher", "admin"],
            },
          },
        });

        const roleIds = teacherAdminRoles.map((r) => r.id);

        // Remove existing teacher/admin roles and add the new one
        await tx.userRole.deleteMany({
          where: {
            userId: user.id,
            roleId: {
              in: roleIds,
            },
          },
        });

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: roleRecord.id,
          },
        });
      } else if (user.roles[0]?.role.name !== role) {
        // Role exists but different, update it
        // Get teacher and admin role IDs
        const teacherAdminRoles = await tx.role.findMany({
          where: {
            name: {
              in: ["teacher", "admin"],
            },
          },
        });

        const roleIds = teacherAdminRoles.map((r) => r.id);

        await tx.userRole.deleteMany({
          where: {
            userId: user.id,
            roleId: {
              in: roleIds,
            },
          },
        });

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: roleRecord.id,
          },
        });
      }

      // Handle classroom assignments
      if (classroomIds !== undefined) {
        // Remove existing classroom assignments
        await tx.classroomTeachers.deleteMany({
          where: { userId: user.id },
        });

        // Add new classroom assignments
        if (classroomIds.length > 0) {
          await tx.classroomTeachers.createMany({
            data: classroomIds.map((classroomId) => ({
              classroomId,
              userId: user.id,
            })),
            skipDuplicates: true,
          });
        }
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
        throw new Error("Failed to fetch updated teacher");
      }

      return completeTeacher;
    });

    // Calculate totals
    const totalStudents = updatedTeacher.ClassroomTeachers.reduce((sum, ct) => {
      return sum + ct.classroom.students.length;
    }, 0);
    const totalClasses = updatedTeacher.ClassroomTeachers.length;

    // Format response
    const teacherData: TeacherData = {
      id: updatedTeacher.id,
      name: updatedTeacher.name,
      email: updatedTeacher.email,
      role:
        updatedTeacher.roles.find((r) => r.role.name === role)?.role.name ||
        updatedTeacher.roles[0]?.role.name ||
        "teacher",
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

    return { success: true, teacher: teacherData };
  } catch (error) {
    console.error("Teacher Model: Error updating existing teacher:", error);
    return { success: false, error: "Failed to update teacher" };
  }
}

// Update teacher
export const updateTeacher = async (
  id: string,
  updateData: UpdateTeacherInput,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; teacher?: TeacherData; error?: string }> => {
  try {
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
                in: ["teacher", "admin"],
              },
            },
          },
        },
      },
    });

    if (!existingTeacher) {
      return { success: false, error: "Teacher not found" };
    }

    // Check if email is being updated and doesn't conflict
    if (updateData.email && updateData.email !== existingTeacher.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (emailExists) {
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
      updatedTeacher.roles.find((r) => r.role.name === "admin")?.role.name ||
      updatedTeacher.roles[0]?.role.name ||
      "teacher";

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
                in: ["teacher", "admin"],
              },
            },
          },
        },
      },
    });

    if (!existingTeacher) {
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

    return { success: true };
  } catch (error) {
    console.error("Teacher Model: Error deleting teacher:", error);
    return { success: false, error: "Failed to delete teacher" };
  }
};

// Get teacher statistics
export const getTeacherStatistics = async (userWithRoles: UserWithRoles) => {
  try {
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
              in: ["teacher", "admin"],
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

    return statistics;
  } catch (error) {
    console.error("Teacher Model: Error calculating statistics:", error);
    throw error;
  }
};

export const getTeachersDashboardModel = async (userId: string) => {
  try {
    // Define date ranges
    const now = new Date();
    const todayStart = startOfDay(now);
    const thirtyDaysAgo = startOfDay(subDays(now, 30));

    // Get teacher data with their classes and students
    const teacher = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        School: true,
        ClassroomTeachers: {
          include: {
            classroom: {
              include: {
                students: {
                  include: {
                    student: {
                      select: {
                        id: true,
                        level: true,
                        xp: true,
                        userActivity: {
                          where: {
                            createdAt: {
                              gte: thirtyDaysAgo,
                            },
                          },
                          select: {
                            id: true,
                            createdAt: true,
                          },
                          orderBy: {
                            createdAt: "desc",
                          },
                        },
                      },
                    },
                  },
                },
                Assignment: {
                  include: {
                    AssignmentStudent: {
                      select: {
                        id: true,
                        status: true,
                        updatedAt: true,
                        studentId: true,
                      },
                    },
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

    // Gather all classes
    const classes = teacher.ClassroomTeachers.map((tc) => tc.classroom);

    // Gather all students across all classes with unique IDs
    const studentMap = new Map();
    classes.forEach((classroom) => {
      classroom.students.forEach((cs) => {
        if (!studentMap.has(cs.student.id)) {
          studentMap.set(cs.student.id, cs.student);
        }
      });
    });

    const allStudents = Array.from(studentMap.values());
    const totalStudents = allStudents.length;

    // Count active students (active in last 30 days)
    const activeStudents30d = allStudents.filter(
      (student) => student.userActivity && student.userActivity.length > 0,
    ).length;

    // Calculate average class level
    const avgLevel =
      totalStudents > 0
        ? allStudents.reduce((sum, s) => sum + (s.level || 0), 0) /
          totalStudents
        : 0;

    // Count pending assignments
    const pendingAssignments = classes.reduce((total, classroom) => {
      const classroomPendingCount = classroom.Assignment.filter(
        (assignment) => {
          return assignment.AssignmentStudent.some(
            (studentAssignment) =>
              studentAssignment.status !== AssignmentStatus.COMPLETED,
          );
        },
      ).length;
      return total + classroomPendingCount;
    }, 0);

    // Count students active today
    const studentsActiveToday = allStudents.filter((student) => {
      return (
        student.userActivity &&
        student.userActivity.some(
          (activity: { id: string; createdAt: Date }) =>
            new Date(activity.createdAt) >= todayStart,
        )
      );
    }).length;

    // Count assignments completed today
    const assignmentsCompletedToday = classes.reduce((total, classroom) => {
      const todayCompletedCount = classroom.Assignment.reduce(
        (assignmentTotal, assignment) => {
          const completedToday = assignment.AssignmentStudent.filter(
            (studentAssignment) =>
              studentAssignment.status === AssignmentStatus.COMPLETED &&
              new Date(studentAssignment.updatedAt) >= todayStart,
          ).length;
          return assignmentTotal + completedToday;
        },
        0,
      );
      return total + todayCompletedCount;
    }, 0);

    // Calculate data for each classroom
    const sevenDaysAgo = startOfDay(subDays(now, 7));
    const classesData = classes.map((classroom) => {
      const students = classroom.students.map((cs) => cs.student);

      // Count active students in last 7 days
      const activeStudents7d = students.filter(
        (student) =>
          student.userActivity &&
          student.userActivity.some(
            (activity: { id: string; createdAt: Date }) =>
              new Date(activity.createdAt) >= sevenDaysAgo,
          ),
      ).length;

      // Calculate average level for this class
      const classAvgLevel =
        students.length > 0
          ? students.reduce((sum, s) => sum + (s.level || 0), 0) /
            students.length
          : 0;

      // Calculate total XP for this class
      const totalXp = students.reduce((sum, s) => sum + (s.xp || 0), 0);

      // Count assignments for this class
      const totalAssignments = classroom.Assignment.length;
      const pendingAssignmentsCount = classroom.Assignment.filter(
        (assignment) =>
          assignment.AssignmentStudent.some(
            (sa) => sa.status !== AssignmentStatus.COMPLETED,
          ),
      ).length;
      const completedAssignmentsCount =
        totalAssignments - pendingAssignmentsCount;

      return {
        id: classroom.id,
        name: classroom.name || "Unnamed Class",
        classCode: classroom.classCode || "",
        studentCount: students.length,
        activeStudents7d,
        averageLevel: Math.round(classAvgLevel * 10) / 10,
        totalXp,
        assignments: {
          total: totalAssignments,
          pending: pendingAssignmentsCount,
          completed: completedAssignmentsCount,
        },
        createdAt: classroom.createdAt.toISOString(),
        archived: false, // Default to false since archived field doesn't exist in schema
      };
    });

    const response: TeacherOverviewResponse = {
      teacher: {
        id: teacher.id,
        name: teacher.name || "",
        email: teacher.email || "",
        schoolId: teacher.schoolId || undefined,
        schoolName: teacher.School?.name || undefined,
      },
      summary: {
        totalClasses: classes.length,
        totalStudents,
        activeStudents30d,
        averageClassLevel: Math.round(avgLevel * 10) / 10,
        pendingAssignments,
      },
      recentActivity: {
        studentsActiveToday,
        assignmentsCompletedToday,
      },
      classes: {
        classesData,
        summary: {
          total: classes.length,
          active: classes.length, // All classes are active since archived field doesn't exist
          archived: 0, // No archived classes
        },
      },
      cache: {
        cached: false,
        generatedAt: now.toISOString(),
      },
    };

    return response;
  } catch (error) {
    console.error("[Model] getTeachersDashboardModel - Error:", error);
    throw error;
  }
};

export const getTeacherClassReportModel = async (classId: string) => {
  try {
    // Define date ranges
    const now = new Date();
    const sevenDaysAgo = startOfDay(subDays(now, 7));
    const thirtyDaysAgo = startOfDay(subDays(now, 30));

    // Fetch the classroom and ensure it belongs to the teacher
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: classId,
      },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                level: true,
                xp: true,
                userActivity: {
                  where: {
                    createdAt: {
                      gte: thirtyDaysAgo,
                    },
                  },
                  select: {
                    id: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
        Assignment: {
          include: {
            AssignmentStudent: {
              select: {
                id: true,
                status: true,
                updatedAt: true,
                studentId: true,
                score: true,
              },
            },
          },
        },
      },
    });

    if (!classroom) {
      throw new Error("Classroom not found or access denied");
    }

    // Calculate assignment statistics
    const totalAssignments = classroom.Assignment.length;
    const completedAssignments = classroom.Assignment.filter((assignment) =>
      assignment.AssignmentStudent.every(
        (sa) => sa.status === AssignmentStatus.COMPLETED,
      ),
    ).length;

    const activeAssignments = totalAssignments - completedAssignments;

    const assignmentMetrics: AssignmentMetrics[] = classroom.Assignment.map(
      (assignment) => {
        const total = assignment.AssignmentStudent.length;
        const completed = assignment.AssignmentStudent.filter(
          (sa) => sa.status === AssignmentStatus.COMPLETED,
        ).length;
        const inProgress = assignment.AssignmentStudent.filter(
          (sa) => sa.status === AssignmentStatus.IN_PROGRESS,
        ).length;
        const notStarted = assignment.AssignmentStudent.filter(
          (sa) => sa.status === AssignmentStatus.NOT_STARTED,
        ).length;

        const scores = assignment.AssignmentStudent.filter(
          (sa) => sa.score !== null,
        ).map((sa) => sa.score!);

        const averageScore =
          scores.length > 0
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : 0;

        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        return {
          assignmentId: assignment.id,
          articleId: assignment.articleId,
          name: assignment.name || "Untitled Assignment",
          dueDate: assignment.dueDate?.toISOString(),
          assigned: total,
          completed,
          inProgress,
          notStarted,
          averageScore: Math.round(averageScore * 100) / 100,
          completionRate: Math.round(completionRate * 10) / 10,
        };
      },
    );

    // Calculate student statistics
    const allStudents = classroom.students.map((cs) => cs.student);
    const totalStudents = allStudents.length;

    // Calculate total XP earned
    const totalXpEarned = allStudents.reduce(
      (sum, student) => sum + (student.xp || 0),
      0,
    );

    // Calculate average level
    const averageLevel =
      totalStudents > 0
        ? allStudents.reduce((sum, student) => sum + (student.level || 0), 0) /
          totalStudents
        : 0;

    // Count active students in 7 days
    const activeStudents7d = allStudents.filter((student) =>
      student.userActivity.some(
        (activity) => new Date(activity.createdAt) >= sevenDaysAgo,
      ),
    ).length;

    // Count active students in 30 days
    const activeStudents30d = allStudents.filter(
      (student) => student.userActivity.length > 0,
    ).length;

    // Prepare student reports
    const studentReports = classroom.students.map((cs) => {
      const student = cs.student;
      const assignments = classroom.Assignment.map((assignment) => {
        const studentAssignment = assignment.AssignmentStudent.find(
          (sa) => sa.studentId === student.id,
        );
        return {
          assignmentId: assignment.id,
          status: studentAssignment ? studentAssignment.status : "not assigned",
          updatedAt: studentAssignment ? studentAssignment.updatedAt : null,
        };
      });

      // Check if student was active in last 7 and 30 days
      const activeIn7d = student.userActivity.some(
        (activity) => new Date(activity.createdAt) >= sevenDaysAgo,
      );
      const activeIn30d = student.userActivity.length > 0;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        level: student.level,
        xp: student.xp,
        activeIn7d,
        activeIn30d,
        assignments,
      };
    });

    const velocityData = await getVelocityClassroom(classId);
    const genreMetricsData = await getGenreMetricsModel(classId);
    const heatmapData = await getClassroomHeatmapModel(classId);
    const alignmentData = await getClassroomAlignmentModel(classId);
    const accuracyData = await getTeachersClassAccuracyModel(classId);

    const report = {
      classId: classroom.id,
      className: classroom.name || "Unnamed Class",
      classCode: classroom.classCode || "",
      studentCount: totalStudents,
      statistics: {
        assignments: {
          assignmentMetrics,
          total: totalAssignments,
          completed: completedAssignments,
          averageCompletionRate:
            totalAssignments > 0
              ? Math.round((completedAssignments / totalAssignments) * 1000) /
                10
              : 0,
          active: activeAssignments,
        },
        students: {
          total: totalStudents,
          activeIn7d: activeStudents7d,
          activeIn30d: activeStudents30d,
        },
        totalXpEarned,
        averageLevel: Math.round(averageLevel * 10) / 10,
      },
      students: studentReports,
      velocity: velocityData,
      genreMetrics: genreMetricsData,
      heatmap: heatmapData,
      alignment: alignmentData,
      accuracy: accuracyData,
    };

    return report;
  } catch (error) {
    console.error("[Model] getTeacherClassReportModel - Error:", error);
    throw error;
  }
};

export const getVelocityClassroom = async (
  classId: string,
): Promise<MetricsVelocityResponse> => {
  try {
    const now = new Date();
    const startDate = subYears(now, 1);
    const daysAgo = 365;

    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };

    // Fetch assignment completions
    const assignmentStudents = await prisma.assignmentStudent.findMany({
      where: {
        ...whereClause,
        status: AssignmentStatus.COMPLETED,
        assignment: classId
          ? {
              classroomId: classId,
            }
          : undefined,
      },
      select: {
        createdAt: true,
        completedAt: true,
        studentId: true,
        assignment: {
          select: {
            article: {
              select: {
                raLevel: true,
                passage: true,
              },
            },
          },
        },
        student: {
          select: {
            level: true,
          },
        },
      },
    });

    // Initialize date map with all dates in range
    const dateMap = new Map<
      string,
      {
        articlesRead: number;
        wordsRead: number;
        timeSpent: number;
        totalLevel: number;
        count: number;
      }
    >();

    // Populate all dates in the range
    for (
      let d = new Date(startDate);
      d <= now;
      d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const dateKey = d.toISOString().split("T")[0];
      dateMap.set(dateKey, {
        articlesRead: 0,
        wordsRead: 0,
        timeSpent: 0,
        totalLevel: 0,
        count: 0,
      });
    }

    // Aggregate data by date
    assignmentStudents.forEach((record) => {
      const recordDate = record.completedAt || record.createdAt;
      const dateKey = new Date(recordDate).toISOString().split("T")[0];
      const data = dateMap.get(dateKey);

      if (data) {
        data.articlesRead += 1;

        if (record.assignment?.article?.passage) {
          const wordCount =
            record.assignment.article.passage.split(/\s+/).length;
          data.wordsRead += wordCount;
          data.timeSpent += Math.ceil(wordCount / 200);
        }

        data.totalLevel += record.student?.level || 0;
        data.count += 1;
      }
    });

    // Convert to data points array
    const dataPoints: VelocityDataPoint[] = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        articlesRead: data.articlesRead,
        wordsRead: data.wordsRead,
        timeSpent: data.timeSpent,
        averageLevel:
          data.count > 0
            ? Math.round((data.totalLevel / data.count) * 10) / 10
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate summary statistics
    const totalArticles = assignmentStudents.length;
    const totalWords = dataPoints.reduce((sum, dp) => sum + dp.wordsRead, 0);
    const totalTime = dataPoints.reduce((sum, dp) => sum + dp.timeSpent, 0);
    const averagePerDay = Math.round((totalArticles / daysAgo) * 10) / 10;

    // Calculate trend
    const midPoint = Math.floor(dataPoints.length / 2);
    const firstHalf = dataPoints.slice(0, midPoint);
    const secondHalf = dataPoints.slice(midPoint);

    const firstHalfAvg =
      firstHalf.length > 0
        ? firstHalf.reduce((sum, dp) => sum + dp.articlesRead, 0) /
          firstHalf.length
        : 0;

    const secondHalfAvg =
      secondHalf.length > 0
        ? secondHalf.reduce((sum, dp) => sum + dp.articlesRead, 0) /
          secondHalf.length
        : 0;

    let trend: "up" | "down" | "stable" = "stable";
    if (secondHalfAvg > firstHalfAvg * 1.1) trend = "up";
    else if (secondHalfAvg < firstHalfAvg * 0.9) trend = "down";

    const response: MetricsVelocityResponse = {
      timeframe: "365",
      dataPoints,
      summary: {
        totalArticles,
        totalWords,
        totalTime,
        averagePerDay,
        trend,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    return response;
  } catch (error) {
    console.error("[Model] getVelocityClassroom - Error:", error);
    throw error;
  }
};

export const getGenreMetricsModel = async (
  classId: string,
): Promise<MetricsGenresResponse> => {
  try {
    const now = new Date();
    const startDate = subDays(now, 90);

    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };

    // Fetch assignment completions
    const assignmentStudents = await prisma.assignmentStudent.findMany({
      where: {
        ...whereClause,
        assignment: classId
          ? {
              classroomId: classId,
            }
          : undefined,
      },
      select: {
        createdAt: true,
        completedAt: true,
        studentId: true,
        assignment: {
          select: {
            article: {
              select: {
                id: true,
                genre: true,
                raLevel: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
          },
        },
      },
    });

    // Use assignmentStudents as the data source
    const filteredRecords = assignmentStudents;

    // Get XP for each article from UserActivity and XPLogs
    const articleIds = filteredRecords
      .map((r) => r.assignment?.article?.id)
      .filter((id): id is string => !!id);

    const userIds = [...new Set(filteredRecords.map((r) => r.studentId))];

    // Get XP data from UserActivity + XPLogs using Prisma
    // Include both direct article activities and MC_QUESTION activities
    const userActivities = await prisma.userActivity.findMany({
      where: {
        userId: { in: userIds },
        createdAt: { gte: startDate },
      },
      include: {
        xpLogs: {
          where: {
            createdAt: { gte: startDate },
          },
        },
      },
    });

    // Create XP lookup map by filtering activities and calculating XP
    const xpMap = new Map<string, number>();
    userActivities.forEach((activity) => {
      // Get article ID from targetId or details.articleId
      const articleId =
        (activity.details as any)?.articleId || activity.targetId;

      // Check if this article is in our list
      if (articleId && articleIds.includes(articleId)) {
        const key = `${activity.userId}:${articleId}`;
        const totalXp = activity.xpLogs.reduce(
          (sum: number, log) => sum + log.xpEarned,
          0,
        );
        const currentXp = xpMap.get(key) || 0;
        xpMap.set(key, currentXp + totalXp);
      }
    });

    const genreMap = new Map<
      string,
      {
        count: number;
        totalLevel: number;
        totalXp: number;
        userSet: Set<string>;
      }
    >();

    filteredRecords.forEach((record) => {
      const genre = record.assignment?.article?.genre || "Unknown";

      if (!genreMap.has(genre)) {
        genreMap.set(genre, {
          count: 0,
          totalLevel: 0,
          totalXp: 0,
          userSet: new Set(),
        });
      }

      const data = genreMap.get(genre)!;
      data.count += 1;
      data.totalLevel += record.assignment?.article?.raLevel || 0;

      // Get XP from the lookup map instead of user.xp
      const xpKey = `${record.studentId}:${record.assignment?.article?.id}`;
      const articleXp = xpMap.get(xpKey) || 0;
      data.totalXp += articleXp;

      data.userSet.add(record.studentId);
    });

    const totalReads = filteredRecords.length;

    const genres: GenreMetrics[] = Array.from(genreMap.entries())
      .map(([genre, data]) => ({
        genre,
        count: data.count,
        percentage:
          totalReads > 0
            ? Math.round((data.count / totalReads) * 100 * 10) / 10
            : 0,
        averageLevel:
          data.count > 0
            ? Math.round((data.totalLevel / data.count) * 10) / 10
            : 0,
        totalXp: data.totalXp,
      }))
      .sort((a, b) => b.count - a.count);

    let diversity = 0;
    if (totalReads > 0) {
      genres.forEach((g) => {
        const p = g.count / totalReads;
        if (p > 0) {
          diversity -= p * Math.log2(p);
        }
      });
      const maxEntropy = Math.log2(Math.min(genres.length, 10));
      diversity = maxEntropy > 0 ? diversity / maxEntropy : 0;
    }

    const timeframe = "90d";

    const response: MetricsGenresResponse = {
      timeframe,
      genres,
      summary: {
        totalGenres: genres.length,
        mostPopular: genres.length > 0 ? genres[0].genre : "N/A",
        diversity: Math.round(diversity * 100) / 100,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    return response;
  } catch (error) {
    console.error("[Model] getGenreMetricsModel - Error:", error);
    throw error;
  }
};

export async function getClassroomHeatmapModel(
  classId?: string,
  expanded: boolean = false,
) {
  const startTime = Date.now();

  try {
    const now = new Date();
    const startDate = subDays(now, expanded ? 365 : 120);

    // Build where clause based on filters
    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };

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
      ? activities.filter((a: any) => a.user.studentClassroom?.length > 0)
      : activities;

    // Group by date
    const dateMap = new Map<
      string,
      {
        activeUsers: Set<string>;
        newUsers: Set<string>;
        sessions: number;
        totalTime: number;
      }
    >();

    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dateMap.set(dateKey, {
        activeUsers: new Set(),
        newUsers: new Set(),
        sessions: 0,
        totalTime: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process activities
    filteredActivities.forEach((activity: any) => {
      const dateKey = new Date(activity.createdAt).toISOString().split("T")[0];
      const data = dateMap.get(dateKey);

      if (data) {
        data.activeUsers.add(activity.userId);
        data.sessions += 1;
        if (activity.timer) {
          data.totalTime += activity.timer;
        }

        // Check if user is new (created on this day)
        const userCreatedDate = new Date(activity.user.createdAt)
          .toISOString()
          .split("T")[0];
        if (userCreatedDate === dateKey) {
          data.newUsers.add(activity.userId);
        }
      }
    });

    // Convert to response format
    const dataPoints: ActivityDataPoint[] = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        activeUsers: data.activeUsers.size,
        newUsers: data.newUsers.size,
        readingSessions: data.sessions,
        averageSessionLength:
          data.sessions > 0
            ? Math.round((data.totalTime / data.sessions / 60) * 10) / 10
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate summary
    const totalActiveUsers = new Set(
      filteredActivities.map((a: any) => a.userId),
    ).size;

    const totalSessions = filteredActivities.length;

    const totalTime = filteredActivities
      .filter((a: any) => a.timer)
      .reduce((sum: number, a: any) => sum + a.timer, 0);

    const averageSessionLength =
      totalSessions > 0
        ? Math.round((totalTime / totalSessions / 60) * 10) / 10
        : 0;

    const peakDay = dataPoints.reduce(
      (peak, current) =>
        current.activeUsers > peak.activeUsers ? current : peak,
      dataPoints[0] || {
        date: "",
        activeUsers: 0,
        newUsers: 0,
        readingSessions: 0,
        averageSessionLength: 0,
      },
    ).date;

    const response: MetricsActivityResponse = {
      dateRange: expanded ? "365" : "120",
      dataPoints,
      summary: {
        totalActiveUsers,
        totalSessions,
        averageSessionLength,
        peakDay,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    return response;
  } catch (error) {
    console.error("[Controller] getActivityMetrics - Error:", error);
    throw error;
  }
}

export const getClassroomAlignmentModel = async (classId: string) => {
  const startTime = Date.now();

  try {
    const now = new Date();
    const startDate = subDays(now, 90);

    // Fetch classroom with students and their reading activities
    const classroom = await prisma.classroom.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                level: true,
                cefrLevel: true,
                ArticleActivityLog: {
                  where: {
                    createdAt: { gte: startDate },
                  },
                  include: {
                    article: {
                      select: {
                        id: true,
                        title: true,
                        raLevel: true,
                        cefrLevel: true,
                        genre: true,
                      },
                    },
                  },
                  orderBy: { createdAt: "desc" },
                },
              },
            },
          },
        },
        Assignment: {
          where: {
            createdAt: { gte: startDate },
          },
          select: {
            id: true,
            articleId: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Helper function to classify alignment
    const classifyAlignment = (
      articleLevel: number | null,
      studentLevel: number | null,
    ): "below" | "aligned" | "above" | "unknown" => {
      if (articleLevel === null || studentLevel === null) return "unknown";
      const diff = articleLevel - studentLevel;
      if (diff < -1) return "below";
      if (diff > 1) return "above";
      return "aligned";
    };

    // Helper function to extract top samples
    const extractTopSamples = (
      activities: any[],
      category: "below" | "aligned" | "above",
      limit: number,
    ): AlignmentSample[] => {
      return activities
        .filter((activity) => {
          const classification = classifyAlignment(
            activity.article.raLevel,
            activity.student.level,
          );
          return classification === category;
        })
        .map((activity) => ({
          articleId: activity.article.id,
          title: activity.article.title || "Untitled Article",
          articleRaLevel: activity.article.raLevel || 0,
          articleCefrLevel: activity.article.cefrLevel,
          studentRaLevel: activity.student.level,
          levelDiff:
            (activity.article.raLevel || 0) - (activity.student.level || 0),
          readAt: activity.createdAt.toISOString(),
          assignmentId: activity.assignmentId,
          genre: activity.article.genre,
        }))
        .sort((a, b) => Math.abs(b.levelDiff) - Math.abs(a.levelDiff))
        .slice(0, limit);
    };

    // Process all student activities
    const allActivities: any[] = [];
    const studentLevels: number[] = [];

    classroom.students.forEach((cs) => {
      const student = cs.student;
      if (student.level) {
        studentLevels.push(student.level);
      }

      student.ArticleActivityLog.forEach((activity) => {
        allActivities.push({
          ...activity,
          student: {
            id: student.id,
            level: student.level,
            cefrLevel: student.cefrLevel,
          },
        });
      });
    });

    // Calculate alignment buckets
    let belowCount = 0;
    let alignedCount = 0;
    let aboveCount = 0;
    let unknownCount = 0;

    allActivities.forEach((activity) => {
      const classification = classifyAlignment(
        activity.article.raLevel,
        activity.student.level,
      );
      switch (classification) {
        case "below":
          belowCount++;
          break;
        case "aligned":
          alignedCount++;
          break;
        case "above":
          aboveCount++;
          break;
        case "unknown":
          unknownCount++;
          break;
      }
    });

    const totalReadings = allActivities.length;
    const buckets: AlignmentBuckets = {
      below: belowCount,
      aligned: alignedCount,
      above: aboveCount,
      unknown: unknownCount,
    };

    const bucketPercentages: AlignmentBuckets = {
      below:
        totalReadings > 0
          ? Math.round((belowCount / totalReadings) * 100 * 10) / 10
          : 0,
      aligned:
        totalReadings > 0
          ? Math.round((alignedCount / totalReadings) * 100 * 10) / 10
          : 0,
      above:
        totalReadings > 0
          ? Math.round((aboveCount / totalReadings) * 100 * 10) / 10
          : 0,
      unknown:
        totalReadings > 0
          ? Math.round((unknownCount / totalReadings) * 100 * 10) / 10
          : 0,
    };

    const alignmentScore =
      totalReadings > 0 ? Math.round((alignedCount / totalReadings) * 100) : 0;

    // Extract samples (limit to top 5 per bucket)
    const samples: AlignmentData["samples"] = {
      below: extractTopSamples(allActivities, "below", 5),
      aligned: extractTopSamples(allActivities, "aligned", 5),
      above: extractTopSamples(allActivities, "above", 5),
    };

    // Calculate misalignment indicators
    const studentMisalignmentMap = new Map<
      string,
      { total: number; misaligned: number }
    >();

    allActivities.forEach((activity) => {
      const studentId = activity.student.id;
      if (!studentMisalignmentMap.has(studentId)) {
        studentMisalignmentMap.set(studentId, { total: 0, misaligned: 0 });
      }

      const stats = studentMisalignmentMap.get(studentId)!;
      stats.total++;

      const classification = classifyAlignment(
        activity.article.raLevel,
        activity.student.level,
      );
      if (classification === "below" || classification === "above") {
        stats.misaligned++;
      }
    });

    const highRiskStudents = Array.from(studentMisalignmentMap.values()).filter(
      (stats) => stats.total > 0 && stats.misaligned / stats.total > 0.7,
    ).length;

    // Calculate content gaps
    const belowThreshold = Math.round(belowCount * 0.8);
    const aboveThreshold = Math.round(aboveCount * 0.8);

    // Build level and CEFR distributions
    const levelDistribution: Record<string, number> = {};
    const cefrDistribution: Record<string, number> = {};

    classroom.students.forEach((cs) => {
      const student = cs.student;
      if (student.level) {
        const levelKey = `Level ${student.level}`;
        levelDistribution[levelKey] = (levelDistribution[levelKey] || 0) + 1;
      }
      if (student.cefrLevel) {
        cefrDistribution[student.cefrLevel] =
          (cefrDistribution[student.cefrLevel] || 0) + 1;
      }
    });

    const alignment: AlignmentData = {
      levelDistribution,
      cefrDistribution,
      recommendations: {
        studentsAboveLevel: aboveCount,
        studentsBelowLevel: belowCount,
        studentsOnLevel: alignedCount,
      },
      buckets: {
        counts: buckets,
        percentages: bucketPercentages,
      },
      samples,
      misalignmentIndicators: {
        highRiskStudents,
        assignmentOverrides: classroom.Assignment.length,
        contentGaps: {
          belowThreshold,
          aboveThreshold,
        },
      },
    };

    // Calculate summary statistics
    const totalStudents = classroom.students.length;
    const averageLevel =
      studentLevels.length > 0
        ? studentLevels.reduce((sum, level) => sum + level, 0) /
          studentLevels.length
        : 0;

    const levelCounts = studentLevels.reduce(
      (acc: Record<number, number>, level) => {
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {},
    );

    const modalLevel =
      Object.entries(levelCounts).length > 0
        ? Object.entries(levelCounts).reduce(
            (max, [level, count]) =>
              count > max.count ? { level: parseInt(level), count } : max,
            { level: 1, count: 0 },
          ).level
        : 1;

    const response: MetricsAlignmentResponse = {
      alignment,
      summary: {
        totalStudents,
        averageLevel: Math.round(averageLevel * 10) / 10,
        modalLevel,
        totalReadings,
        alignmentScore,
      },
      cache: {
        cached: false,
        generatedAt: now.toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    return response;
  } catch (error) {
    console.error("[Model] getClassroomAlignmentModel - Error:", error);
    throw error;
  }
};

export const getTeachersClassAccuracyModel = async (classId: string) => {
  try {
    const now = new Date();
    const startDate = subDays(now, 90);

    // Get all students in classroom
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId: classId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            level: true,
            cefrLevel: true,
          },
        },
      },
    });

    const studentIds = classroomStudents.map((cs) => cs.studentId);

    // Get all user activities for these students in timeframe
    const activities = await prisma.userActivity.findMany({
      where: {
        userId: { in: studentIds },
        createdAt: { gte: startDate },
        activityType: {
          in: [
            ActivityType.MC_QUESTION,
            ActivityType.SA_QUESTION,
            ActivityType.LA_QUESTION,
          ],
        },
        completed: true,
      },
      select: {
        userId: true,
        activityType: true,
        details: true,
      },
    });

    // Calculate accuracy per student per question type
    const studentMetrics = studentIds.map((studentId) => {
      const student = classroomStudents.find(
        (cs) => cs.studentId === studentId,
      )?.student;
      const studentActivities = activities.filter(
        (a) => a.userId === studentId,
      );

      // MCQ accuracy
      const mcqActivities = studentActivities.filter(
        (a) => a.activityType === ActivityType.MC_QUESTION,
      );
      const mcqCorrect = mcqActivities.filter((a) => {
        const details = a.details as any;
        return details?.isCorrect === true || details?.correct === true;
      }).length;
      const mcqAccuracy =
        mcqActivities.length > 0
          ? (mcqCorrect / mcqActivities.length) * 100
          : 0;

      // Open-ended accuracy (SAQ + LAQ)
      const openEndedActivities = studentActivities.filter(
        (a) =>
          a.activityType === ActivityType.SA_QUESTION ||
          a.activityType === ActivityType.LA_QUESTION,
      );
      const openEndedCorrect = openEndedActivities.filter((a) => {
        const details = a.details as any;
        // For open-ended, check score or rating (assuming score >= 3 out of 5 is "correct")
        return details?.score >= 3 || details?.rating >= 3;
      }).length;
      const openEndedAccuracy =
        openEndedActivities.length > 0
          ? (openEndedCorrect / openEndedActivities.length) * 100
          : 0;

      // Overall accuracy
      const totalAttempts = studentActivities.length;
      const totalCorrect = mcqCorrect + openEndedCorrect;
      const overallAccuracy =
        totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

      return {
        studentId,
        studentName: student?.name || "Unknown",
        level: student?.level || 1,
        cefrLevel: student?.cefrLevel || "A1-",
        mcqAccuracy: Math.round(mcqAccuracy * 10) / 10,
        mcqAttempts: mcqActivities.length,
        openEndedAccuracy: Math.round(openEndedAccuracy * 10) / 10,
        openEndedAttempts: openEndedActivities.length,
        overallAccuracy: Math.round(overallAccuracy * 10) / 10,
        totalAttempts,
      };
    });

    // Calculate class averages
    const validStudents = studentMetrics.filter((s) => s.totalAttempts > 0);
    const classAverages = {
      mcqAccuracy:
        validStudents.length > 0
          ? Math.round(
              (validStudents.reduce((sum, s) => sum + s.mcqAccuracy, 0) /
                validStudents.length) *
                10,
            ) / 10
          : 0,
      openEndedAccuracy:
        validStudents.length > 0
          ? Math.round(
              (validStudents.reduce((sum, s) => sum + s.openEndedAccuracy, 0) /
                validStudents.length) *
                10,
            ) / 10
          : 0,
      overallAccuracy:
        validStudents.length > 0
          ? Math.round(
              (validStudents.reduce((sum, s) => sum + s.overallAccuracy, 0) /
                validStudents.length) *
                10,
            ) / 10
          : 0,
      totalAttempts: studentMetrics.reduce(
        (sum, s) => sum + s.totalAttempts,
        0,
      ),
      activeStudents: validStudents.length,
    };

    return {
      students: studentMetrics,
      classAverages,
    };
  } catch (error) {
    console.error("[getClassAccuracy] Error fetching class accuracy:", error);
    throw error;
  }
};

export async function getTeacherClassGoalsModel(classroomId: string) {
  try {
    // Get all students in the classroom
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId },
      include: {
        classroom: {
          select: {
            name: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Get goals for all students
    const studentIds = classroomStudents.map((cs) => cs.studentId);

    const goals = await prisma.learningGoal.findMany({
      where: {
        userId: { in: studentIds },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    // Group goals by similar characteristics (title, goalType, targetValue, targetDate)
    // to identify goals that were created for the whole class
    const goalGroups = new Map<
      string,
      {
        goalInfo: {
          id: string;
          goalType: string;
          title: string;
          description: string | null;
          targetValue: number;
          unit: string;
          targetDate: Date;
          priority: string;
          createdAt: Date;
        };
        students: {
          studentId: string;
          studentName: string | null;
          studentEmail: string | null;
          studentImage: string | null;
          goalId: string;
          currentValue: number;
          status: string;
          completedAt: Date | null;
        }[];
        totalStudents: number;
        completedCount: number;
        activeCount: number;
        averageProgress: number;
      }
    >();

    goals.forEach((goal) => {
      // Create a key based on goal characteristics
      const key = `${goal.title}|${goal.goalType}|${goal.targetValue}|${goal.targetDate.getTime()}`;

      const student = classroomStudents.find(
        (cs) => cs.studentId === goal.userId,
      );

      if (!goalGroups.has(key)) {
        goalGroups.set(key, {
          goalInfo: {
            id: goal.id, // Use first goal's ID as representative
            goalType: goal.goalType,
            title: goal.title,
            description: goal.description,
            targetValue: goal.targetValue,
            unit: goal.unit,
            targetDate: goal.targetDate,
            priority: goal.priority,
            createdAt: goal.createdAt,
          },
          students: [],
          totalStudents: 0,
          completedCount: 0,
          activeCount: 0,
          averageProgress: 0,
        });
      }

      const group = goalGroups.get(key)!;
      group.students.push({
        studentId: goal.userId,
        studentName: student?.student.name || null,
        studentEmail: student?.student.email || null,
        studentImage: student?.student.image || null,
        goalId: goal.id,
        currentValue: goal.currentValue,
        status: goal.status,
        completedAt: goal.completedAt,
      });
      group.totalStudents++;
      if (goal.status === "COMPLETED") group.completedCount++;
      if (goal.status === "ACTIVE") group.activeCount++;
    });

    // Calculate average progress for each group
    goalGroups.forEach((group) => {
      const totalProgress = group.students.reduce((sum, student) => {
        return sum + (student.currentValue / group.goalInfo.targetValue) * 100;
      }, 0);
      group.averageProgress =
        group.totalStudents > 0 ? totalProgress / group.totalStudents : 0;
    });

    // Convert map to array
    const groupedGoals = Array.from(goalGroups.values());

    return {
      success: true,
      data: groupedGoals,
      classRoomName: classroomStudents[0]?.classroom?.name || "",
      total: groupedGoals.length,
    };
  } catch (error) {
    console.error("Error fetching classroom goals:", error);
    throw new Error("Failed to fetch classroom goals");
  }
}

/**
 * Create a goal for all students in the classroom
 */
export async function createTeacherClassGoalModel(
  classroomId: string,
  goalData: CreateGoalInput,
) {
  try {
    // Get all students in the classroom
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId },
      select: { studentId: true },
    });

    if (classroomStudents.length === 0) {
      throw new Error("No students found in the classroom");
    }

    // Create goal for all students
    const goals = await Promise.all(
      classroomStudents.map(
        async (cs) =>
          // GoalsService.createGoal(cs.studentId, goalData),
          await prisma.learningGoal.create({
            data: {
              userId: cs.studentId,
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
          }),
      ),
    );

    return {
      success: true,
      message: `Created goal for ${goals.length} students`,
      count: goals.length,
      goals,
    };
  } catch (error) {
    console.error("Error creating classroom goal:", error);
    throw new Error("Failed to create goals for classroom students");
  }
}

/**
 * Delete a goal for a student in the classroom
 */
export async function deleteTeacherClassGoalModel(
  classroomId: string,
  student: any,
) {
  try {
    const deletedGoal = student.student.map(async (data: any) => {
      await prisma.learningGoal.deleteMany({
        where: {
          id: data.goalId,
          userId: data.studentId,
        },
      });
    });

    await Promise.all(deletedGoal);

    return {
      success: true,
      message: "Goal deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting classroom goal:", error);
    throw new Error("Failed to delete goal");
  }
}
