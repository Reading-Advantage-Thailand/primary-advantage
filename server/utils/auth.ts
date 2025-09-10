import { prisma } from "@/lib/prisma";

// Type definitions for user with roles
export interface UserWithRoles {
  id: string;
  email: string | null;
  schoolId: string | null;
  roles: Array<{
    role: {
      id: string;
      name: string;
    };
  }>;
  SchoolAdmins: Array<{
    id: string;
    schoolId: string;
  }>;
}

// Validate user and return user with roles
export const validateUser = async (
  userId: string,
): Promise<UserWithRoles | null> => {
  try {
    // console.log("Auth Utils: Validating user:", userId);

    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        SchoolAdmins: true,
      },
    });

    if (!userWithRoles) {
      // console.log("Auth Utils: User not found:", userId);
      return null;
    }

    // console.log("Auth Utils: User validated:", {
    //   id: userWithRoles.id,
    //   email: userWithRoles.email,
    //   roles: userWithRoles.roles.map((r) => r.role.name),
    //   schoolAdmins: userWithRoles.SchoolAdmins.length,
    //   schoolId: userWithRoles.schoolId,
    // });

    return userWithRoles;
  } catch (error) {
    console.error("Auth Utils: Error validating user:", error);
    return null;
  }
};

// Check if user has admin permissions
export const checkAdminPermissions = async (
  userWithRoles: UserWithRoles,
): Promise<boolean> => {
  try {
    console.log(
      "Auth Utils: Checking admin permissions for user:",
      userWithRoles.id,
    );

    // Check if user has system or admin role
    const isSystemAdmin = userWithRoles.roles.some(
      (userRole) =>
        userRole.role.name === "SYSTEM" || userRole.role.name === "System",
    );

    const isAdmin = userWithRoles.roles.some(
      (userRole) =>
        userRole.role.name === "ADMIN" || userRole.role.name === "Admin",
    );

    // Check if user is a school admin
    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

    const hasPermission = isSystemAdmin || isAdmin || isSchoolAdmin;

    console.log("Auth Utils: Permission check result:", {
      isSystemAdmin,
      isAdmin,
      isSchoolAdmin,
      hasPermission,
    });

    return hasPermission;
  } catch (error) {
    console.error("Auth Utils: Error checking admin permissions:", error);
    return false;
  }
};

// Check if user has teacher permissions
export const checkTeacherPermissions = async (
  userWithRoles: UserWithRoles,
): Promise<boolean> => {
  try {
    console.log(
      "Auth Utils: Checking teacher permissions for user:",
      userWithRoles.id,
    );

    // Check if user has teacher role or higher
    const isTeacher = userWithRoles.roles.some(
      (userRole) =>
        userRole.role.name === "TEACHER" ||
        userRole.role.name === "Teacher" ||
        userRole.role.name === "ADMIN" ||
        userRole.role.name === "Admin" ||
        userRole.role.name === "SYSTEM" ||
        userRole.role.name === "System",
    );

    // Check if user is a school admin (can also manage teachers/students)
    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

    const hasPermission = isTeacher || isSchoolAdmin;

    console.log("Auth Utils: Teacher permission check result:", {
      isTeacher,
      isSchoolAdmin,
      hasPermission,
    });

    return hasPermission;
  } catch (error) {
    console.error("Auth Utils: Error checking teacher permissions:", error);
    return false;
  }
};

// Check if user has student permissions
export const checkStudentPermissions = async (
  userWithRoles: UserWithRoles,
): Promise<boolean> => {
  try {
    console.log(
      "Auth Utils: Checking student permissions for user:",
      userWithRoles.id,
    );

    // Students can only access their own data, but admins and teachers can access student data
    const hasHigherPermissions = userWithRoles.roles.some(
      (userRole) =>
        userRole.role.name === "TEACHER" ||
        userRole.role.name === "Teacher" ||
        userRole.role.name === "ADMIN" ||
        userRole.role.name === "Admin" ||
        userRole.role.name === "SYSTEM" ||
        userRole.role.name === "System",
    );

    const isStudent = userWithRoles.roles.some(
      (userRole) =>
        userRole.role.name === "STUDENT" || userRole.role.name === "Student",
    );

    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

    const hasPermission = hasHigherPermissions || isStudent || isSchoolAdmin;

    console.log("Auth Utils: Student permission check result:", {
      hasHigherPermissions,
      isStudent,
      isSchoolAdmin,
      hasPermission,
    });

    return hasPermission;
  } catch (error) {
    console.error("Auth Utils: Error checking student permissions:", error);
    return false;
  }
};

// Get user's accessible school IDs
export const getUserSchoolIds = async (
  userWithRoles: UserWithRoles,
): Promise<string[]> => {
  try {
    console.log(
      "Auth Utils: Getting accessible school IDs for user:",
      userWithRoles.id,
    );

    // System admins can access all schools
    const isSystemAdmin = userWithRoles.roles.some(
      (userRole) =>
        userRole.role.name === "SYSTEM" || userRole.role.name === "System",
    );

    if (isSystemAdmin) {
      const allSchools = await prisma.school.findMany({
        select: { id: true },
      });
      const schoolIds = allSchools.map((school) => school.id);

      console.log(
        "Auth Utils: System admin can access all schools:",
        schoolIds.length,
      );
      return schoolIds;
    }

    // School admins can only access their assigned school
    const schoolIds: string[] = [];

    if (userWithRoles.schoolId) {
      schoolIds.push(userWithRoles.schoolId);
    }

    // Add schools where user is a school admin
    const adminSchoolIds = userWithRoles.SchoolAdmins.map(
      (admin) => admin.schoolId,
    );
    adminSchoolIds.forEach((schoolId) => {
      if (!schoolIds.includes(schoolId)) {
        schoolIds.push(schoolId);
      }
    });

    console.log("Auth Utils: User can access schools:", schoolIds);
    return schoolIds;
  } catch (error) {
    console.error("Auth Utils: Error getting user school IDs:", error);
    return [];
  }
};

// Validate if user can access specific school
export const canAccessSchool = async (
  userWithRoles: UserWithRoles,
  schoolId: string,
): Promise<boolean> => {
  try {
    console.log(
      "Auth Utils: Checking school access for user:",
      userWithRoles.id,
      "school:",
      schoolId,
    );

    const accessibleSchoolIds = await getUserSchoolIds(userWithRoles);
    const hasAccess = accessibleSchoolIds.includes(schoolId);

    console.log("Auth Utils: School access result:", hasAccess);
    return hasAccess;
  } catch (error) {
    console.error("Auth Utils: Error checking school access:", error);
    return false;
  }
};

export const getUserRoles = async (userId: string): Promise<string[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { include: { role: true } } },
  });
  return user?.roles.map((role) => role.role.name) || [];
};
