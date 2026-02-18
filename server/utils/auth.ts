import { prisma } from "@/lib/prisma";

// Type definitions for user with role
export interface UserWithRoles {
  id: string;
  email: string | null;
  schoolId: string | null;
  level: number;
  role: string | null;
  SchoolAdmins: Array<{
    id: string;
    schoolId: string;
  }>;
}

// Validate user and return user with role
export const validateUser = async (
  userId: string,
): Promise<UserWithRoles | null> => {
  try {
    const userWithRole = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        schoolId: true,
        level: true,
        role: true,
        SchoolAdmins: true,
      },
    });

    if (!userWithRole) {
      return null;
    }

    return userWithRole;
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
    const role = userWithRoles.role;
    const isSystemAdmin = role === "system";
    const isAdmin = role === "admin";
    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

    return isSystemAdmin || isAdmin || isSchoolAdmin;
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
    const role = userWithRoles.role;
    const isTeacher =
      role === "teacher" || role === "admin" || role === "system";
    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

    return isTeacher || isSchoolAdmin;
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
    const role = userWithRoles.role;
    const hasHigherPermissions =
      role === "teacher" || role === "admin" || role === "system";
    const isStudent = role === "student";
    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

    return hasHigherPermissions || isStudent || isSchoolAdmin;
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
    const isSystemAdmin = userWithRoles.role === "system";

    if (isSystemAdmin) {
      const allSchools = await prisma.school.findMany({
        select: { id: true },
      });
      return allSchools.map((school) => school.id);
    }

    const schoolIds: string[] = [];

    if (userWithRoles.schoolId) {
      schoolIds.push(userWithRoles.schoolId);
    }

    const adminSchoolIds = userWithRoles.SchoolAdmins.map(
      (admin) => admin.schoolId,
    );
    adminSchoolIds.forEach((schoolId) => {
      if (!schoolIds.includes(schoolId)) {
        schoolIds.push(schoolId);
      }
    });

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
    const accessibleSchoolIds = await getUserSchoolIds(userWithRoles);
    return accessibleSchoolIds.includes(schoolId);
  } catch (error) {
    console.error("Auth Utils: Error checking school access:", error);
    return false;
  }
};

export const getUserRoles = async (userId: string): Promise<string[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role ? [user.role] : [];
};
