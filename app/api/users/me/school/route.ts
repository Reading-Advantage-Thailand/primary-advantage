import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schoolSchema = z.object({
  name: z.string().min(2).max(100),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
});

// GET /api/users/me/school - Get current user's school
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        School: {
          include: {
            _count: {
              select: {
                users: true,
                admins: true,
              },
            },
            admins: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add owner and license information manually since the relation might not be set up
    const schoolWithOwner = user.School
      ? {
          ...user.School,
          owner: user.School.ownerId
            ? await prisma.user.findUnique({
                where: { id: user.School.ownerId },
                select: { id: true, name: true, email: true },
              })
            : null,
          license: user.School.licenseId
            ? await prisma.license.findUnique({
                where: { id: user.School.licenseId },
                select: {
                  id: true,
                  key: true,
                  name: true,
                  description: true,
                  maxUsers: true,
                  startDate: true,
                  expiryDate: true,
                  expiryDays: true,
                  status: true,
                },
              })
            : null,
        }
      : null;

    return NextResponse.json({ school: schoolWithOwner });
  } catch (error) {
    console.error("Error fetching user school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/users/me/school - Create and associate school with current user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = schoolSchema.parse(body);

    // Check if user already has a school
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { School: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existingUser.School) {
      return NextResponse.json(
        { error: "User already has a school associated" },
        { status: 400 },
      );
    }

    // Check if school with same name already exists
    const existingSchool = await prisma.school.findFirst({
      where: {
        name: validatedData.name,
      },
    });

    if (existingSchool) {
      return NextResponse.json(
        { error: "A school with this name already exists" },
        { status: 400 },
      );
    }

    // Check current user's roles to see if they need to be upgraded to Admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has Admin role
    const hasAdminRole = currentUser.roles.some(
      (userRole) => userRole.role.name === "Admin",
    );

    // If user doesn't have Admin role and is currently User or Teacher, upgrade them
    if (!hasAdminRole) {
      const currentRoles = currentUser.roles.map((ur) => ur.role.name);
      if (currentRoles.includes("User") || currentRoles.includes("Teacher")) {
        // Find or create Admin role
        let adminRole = await prisma.role.findFirst({
          where: { name: "Admin" },
        });

        if (!adminRole) {
          adminRole = await prisma.role.create({
            data: { name: "Admin" },
          });
        }

        // Remove all existing roles and set Admin role only
        await prisma.userRole.deleteMany({
          where: { userId: session.user.id },
        });

        // Create new Admin role for user
        await prisma.userRole.create({
          data: {
            userId: session.user.id,
            roleId: adminRole.id,
          },
        });
      }
    }

    // Create school and associate with user as owner, member, and admin
    const school = await prisma.school.create({
      data: {
        name: validatedData.name,
        contactName: validatedData.contactName,
        contactEmail: validatedData.contactEmail,
        ownerId: session.user.id,
        users: {
          connect: { id: session.user.id },
        },
        admins: {
          create: {
            userId: session.user.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            users: true,
            admins: true,
          },
        },
        admins: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Add owner information manually
    const schoolWithOwner = {
      ...school,
      owner: await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true },
      }),
      license: school.licenseId
        ? await prisma.license.findUnique({
            where: { id: school.licenseId },
            select: {
              id: true,
              key: true,
              name: true,
              description: true,
              maxUsers: true,
              startDate: true,
              expiryDate: true,
              expiryDays: true,
              status: true,
            },
          })
        : null,
    };

    // Return success with role upgrade information
    const responseData = {
      ...schoolWithOwner,
      roleUpgraded:
        !hasAdminRole &&
        currentUser.roles.some(
          (ur) => ur.role.name === "User" || ur.role.name === "Teacher",
        ),
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Error creating school:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/users/me/school - Update current user's school
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = schoolSchema.parse(body);

    // Get user's school
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { School: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.School) {
      return NextResponse.json(
        { error: "User has no school associated" },
        { status: 400 },
      );
    }

    // Check if another school with the same name exists (excluding current school)
    const existingSchool = await prisma.school.findFirst({
      where: {
        name: validatedData.name,
        id: { not: user.School.id },
      },
    });

    if (existingSchool) {
      return NextResponse.json(
        { error: "A school with this name already exists" },
        { status: 400 },
      );
    }

    // Update school
    const updatedSchool = await prisma.school.update({
      where: { id: user.School.id },
      data: {
        name: validatedData.name,
        contactName: validatedData.contactName,
        contactEmail: validatedData.contactEmail,
      },
      include: {
        _count: {
          select: {
            users: true,
            admins: true,
          },
        },
        admins: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Add owner and license information manually
    const schoolWithOwner = {
      ...updatedSchool,
      owner: updatedSchool.ownerId
        ? await prisma.user.findUnique({
            where: { id: updatedSchool.ownerId },
            select: { id: true, name: true, email: true },
          })
        : null,
      license: updatedSchool.licenseId
        ? await prisma.license.findUnique({
            where: { id: updatedSchool.licenseId },
            select: {
              id: true,
              key: true,
              name: true,
              description: true,
              maxUsers: true,
              startDate: true,
              expiryDate: true,
              expiryDays: true,
              status: true,
            },
          })
        : null,
    };

    return NextResponse.json(schoolWithOwner);
  } catch (error) {
    console.error("Error updating school:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/users/me/school - Delete current user's school (only if they are the owner)
export async function DELETE() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's school
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { School: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.School) {
      return NextResponse.json(
        { error: "User has no school associated" },
        { status: 400 },
      );
    }

    // Check if user is the owner of the school
    if (user.School.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the school owner can delete the school" },
        { status: 403 },
      );
    }

    // Delete the school (this will cascade delete related records)
    await prisma.school.delete({
      where: { id: user.School.id },
    });

    return NextResponse.json({ message: "School deleted successfully" });
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
