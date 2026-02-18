import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";

const schoolSchema = z.object({
  name: z.string().min(2).max(100),
  contactName: z.string().max(100).optional(),
  contactEmail: z.email().optional(),
});

// GET /api/users/me/school - Get current user's school
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userDb = await prisma.user.findUnique({
      where: { id: user.id },
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
            licenses: {
              select: {
                id: true,
                key: true,
                name: true,
                description: true,
                maxUsers: true,
                startDate: true,
                expiryDate: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!userDb) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add owner and license information manually since the relation might not be set up
    const schoolWithOwner = userDb.School
      ? {
          ...userDb.School,
          owner: userDb.School.ownerId
            ? await prisma.user.findUnique({
                where: { id: userDb.School.ownerId },
                select: { id: true, name: true, email: true },
              })
            : null,
          license:
            userDb.School.licenses && userDb.School.licenses.length > 0
              ? userDb.School.licenses[0]
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
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = schoolSchema.parse(body);

    // Check if user already has a school
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
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
      where: { id: user.id },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has Admin role
    const hasAdminRole = currentUser.role === "admin";

    // Check what roles exist in the database
    const allRoles = await prisma.role.findMany();

    // If user doesn't have Admin role and is currently User or Teacher, upgrade them
    if (!hasAdminRole) {
      const currentRoles = currentUser.role;

      if (currentRoles === "user" || currentRoles === "teacher") {
        // Find or create Admin role
        let adminRole = await prisma.role.findFirst({
          where: { name: "admin" },
        });

        if (!adminRole) {
          adminRole = await prisma.role.create({
            data: { name: "admin" },
          });
        }

        // Create new Admin role for user
        await prisma.user.update({
          where: { id: user.id },
          data: { role: adminRole.name, roleId: adminRole.id },
        });
      }
    }

    // Create school and associate with user as owner, member, and admin
    const school = await prisma.school.create({
      data: {
        name: validatedData.name,
        contactName: validatedData.contactName,
        contactEmail: validatedData.contactEmail,
        ownerId: user.id,
        users: {
          connect: { id: user.id },
        },
        admins: {
          create: {
            userId: user.id,
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
        licenses: {
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
            maxUsers: true,
            startDate: true,
            expiryDate: true,
            status: true,
          },
        },
      },
    });

    // Add owner information manually
    const schoolWithOwner = {
      ...school,
      owner: await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true },
      }),
      license:
        school.licenses && school.licenses.length > 0
          ? school.licenses[0]
          : null,
    };

    // Return success with role upgrade information
    const roleUpgraded =
      !hasAdminRole &&
      (currentUser.role === "user" || currentUser.role === "teacher");

    const responseData = {
      ...schoolWithOwner,
      roleUpgraded,
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Error creating school:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error },
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
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = schoolSchema.parse(body);

    // Get user's school
    const userWithSchool = await prisma.user.findUnique({
      where: { id: user.id },
      include: { School: true },
    });

    if (!userWithSchool) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!userWithSchool.School) {
      return NextResponse.json(
        { error: "User has no school associated" },
        { status: 400 },
      );
    }

    // Check if another school with the same name exists (excluding current school)
    const existingSchool = await prisma.school.findFirst({
      where: {
        name: validatedData.name,
        id: { not: userWithSchool.School.id },
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
      where: { id: userWithSchool.School.id },
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
        licenses: {
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
            maxUsers: true,
            startDate: true,
            expiryDate: true,
            status: true,
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
      license:
        updatedSchool.licenses && updatedSchool.licenses.length > 0
          ? updatedSchool.licenses[0]
          : null,
    };

    return NextResponse.json(schoolWithOwner);
  } catch (error) {
    console.error("Error updating school:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error },
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
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's school
    const userWithSchool = await prisma.user.findUnique({
      where: { id: user.id },
      include: { School: true },
    });

    if (!userWithSchool) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!userWithSchool.School) {
      return NextResponse.json(
        { error: "User has no school associated" },
        { status: 400 },
      );
    }

    // Check if user is the owner of the school
    if (userWithSchool.School.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the school owner can delete the school" },
        { status: 403 },
      );
    }

    // Get owner's current roles before deleting school
    const ownerWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
    });

    // Delete the school (this will cascade delete related records)
    await prisma.school.delete({
      where: { id: userWithSchool.School.id },
    });

    // Downgrade owner's role from Admin to User if they have Admin role
    if (ownerWithRoles) {
      const hasAdminRole = ownerWithRoles.role === "admin";

      if (hasAdminRole) {
        // Find or create User role
        let userRole = await prisma.role.findFirst({
          where: { name: "user" },
        });

        if (!userRole) {
          userRole = await prisma.role.create({
            data: { name: "user" },
          });
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: userRole.id, role: userRole.name, schoolId: null },
        });
      }
    }

    return NextResponse.json({ message: "School deleted successfully" });
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
