import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Debug endpoint to check school data
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        School: {
          include: {
            licenses: true, // Direct relation
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Also check all licenses in the system
    const allLicenses = await prisma.license.findMany({
      select: {
        id: true,
        name: true,
        key: true,
        status: true,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        schoolId: dbUser.schoolId,
      },
      school: dbUser.School
        ? {
            id: dbUser.School.id,
            name: dbUser.School.name,
            licenses: dbUser.School.licenses,
          }
        : null,
      allLicenses,
      debug: {
        hasSchool: !!dbUser.School,
        hasLicenses: !!dbUser.School?.licenses,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 },
    );
  }
}
