import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";

const ELEVATED_ROLES = ["teacher", "admin", "system"] as const;
const ADMIN_ROLES = ["admin", "system"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (await params).id;
    const isSelf = currentUser.id === userId;
    const callerRole = currentUser.role ?? "user";

    // Cross-user update requires at least teacher/admin/system role
    if (!isSelf && !ELEVATED_ROLES.includes(callerRole as (typeof ELEVATED_ROLES)[number])) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, email, role, xp, level, cefrLevel, password } = body;

    // Role reassignment requires admin or system
    if (role !== undefined && !ADMIN_ROLES.includes(callerRole as (typeof ADMIN_ROLES)[number])) {
      return NextResponse.json(
        { error: "Access denied. Only admins can change roles." },
        { status: 403 },
      );
    }

    // Password changes are self-service only
    if (password !== undefined && !isSelf) {
      return NextResponse.json(
        { error: "Access denied. You cannot change another user's password." },
        { status: 403 },
      );
    }

    // Build update data object
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (xp !== undefined) updateData.xp = xp;
    if (level !== undefined) updateData.level = level;
    if (cefrLevel !== undefined) updateData.cefrLevel = cefrLevel;

    if (password !== undefined) {
      updateData.password = await hashPassword(password);
    }

    // Use transaction to handle both user data and role updates
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      if (role !== undefined) {
        const roleRecord = await tx.role.findFirst({
          where: { name: role },
        });

        if (!roleRecord) {
          throw new Error(`Role '${role}' not found`);
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            role: roleRecord.name,
            roleId: roleRecord.id,
          },
        });

        return await tx.user.findUnique({
          where: { id: userId },
        });
      }

      return user;
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
