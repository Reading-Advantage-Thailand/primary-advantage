import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUserData = await currentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only teachers and system can update user progress
    if (
      currentUserData.role !== "Teacher" &&
      currentUserData.role !== "System"
    ) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const userId = (await params).id;
    const body = await request.json();

    // Extract all possible update fields
    const { name, email, role, xp, level, cefrLevel, password } = body;

    // Build update data object only with provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (xp !== undefined) updateData.xp = xp;
    if (level !== undefined) updateData.level = level;
    if (cefrLevel !== undefined) updateData.cefrLevel = cefrLevel;

    // Handle password hashing if password is provided
    if (password !== undefined) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    // If updating student-specific fields (xp, level, cefrLevel, password), verify the user is a student
    // and the current user has permission to update them
    if (
      xp !== undefined ||
      level !== undefined ||
      cefrLevel !== undefined ||
      password !== undefined
    ) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { roles: { include: { role: true } } },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (targetUser.roles.some((role) => role.role.name !== "Student")) {
        return NextResponse.json(
          { error: "Student-specific fields can only be updated for students" },
          { status: 400 },
        );
      }

      // If current user is a teacher, verify they have the student in their classroom
      // if (currentUserData.role === "Teacher") {
      //   const studentInTeacherClassroom =
      //     await prisma.classroomStudent.findFirst({
      //       where: {
      //         studentId: userId,
      //         classroom: {
      //           teacherId: currentUserData.id,
      //         },
      //       },
      //     });

      //   if (!studentInTeacherClassroom) {
      //     return NextResponse.json(
      //       { error: "You can only update students in your classrooms" },
      //       { status: 403 },
      //     );
      //   }
      // }

      // Update the updatedAt timestamp when student fields are updated
      updateData.updatedAt = new Date();
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: "User updated successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          xp: user.xp,
          level: user.level,
          cefrLevel: user.cefrLevel,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      {
        error: "Failed to update user",
      },
      {
        status: 500,
      },
    );
  }
}
