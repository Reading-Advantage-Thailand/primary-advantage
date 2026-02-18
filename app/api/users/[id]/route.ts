import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";

// Replace lines 31-47 in your current API with this corrected version:

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUserData = await getCurrentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user permissions based on UserRole table
    // const userWithRoles = await prisma.user.findUnique({
    //   where: { id: currentUserData.id },
    //   include: {
    //     roles: { include: { role: true } },
    //   },
    // });

    // const hasTeacherRole = userWithRoles?.roles.some(
    //   (r) => r.role.name === "teacher",
    // );
    // const hasSystemRole = userWithRoles?.roles.some(
    //   (r) => r.role.name === "system",
    // );

    // if (!hasTeacherRole && !hasSystemRole) {
    //   return NextResponse.json(
    //     { error: "Access denied. Insufficient permissions." },
    //     { status: 403 },
    //   );
    // }

    const userId = (await params).id;
    const body = await request.json();
    const { name, email, role, xp, level, cefrLevel, password } = body;

    // Build update data object (excluding role for now)
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (xp !== undefined) updateData.xp = xp;
    if (level !== undefined) updateData.level = level;
    if (cefrLevel !== undefined) updateData.cefrLevel = cefrLevel;

    // Handle password hashing if password is provided
    if (password !== undefined) {
      updateData.password = await hashPassword(password);
    }

    // Use transaction to handle both user data and role updates
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user data
      const user = await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Handle role update if specified
      if (role !== undefined) {
        // Find the new role by name
        const roleRecord = await tx.role.findFirst({
          where: { name: role },
        });

        if (!roleRecord) {
          throw new Error(`Role '${role}' not found`);
        }

        // Assign the new role
        await tx.user.update({
          where: { id: userId },
          data: {
            role: roleRecord.name,
            roleId: roleRecord.id,
          },
        });

        // Return updated user with roles
        return await tx.user.findUnique({
          where: { id: userId },
        });
      }
    });

    return NextResponse.json(
      {
        message: "User updated successfully",
        user: {
          id: updatedUser?.id,
          name: updatedUser?.name,
          email: updatedUser?.email,
          xp: updatedUser?.xp,
          level: updatedUser?.level,
          cefrLevel: updatedUser?.cefrLevel,
          role: updatedUser?.role,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}
