import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOP_N = 20;

export const GET = withAuth(async (req, context, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const difficulty =
      searchParams.get("difficulty")?.toUpperCase() ?? undefined;

    // user.schoolId is provided by withAuth (from UserWithRoles)
    const { schoolId } = user;

    const rankings = await prisma.gameRanking.findMany({
      where: {
        gameType: "RUNE_MATCH",
        // Filter by difficulty when specified
        ...(difficulty ? { difficulty } : {}),
        // Scope to same school when user belongs to one; otherwise global
        ...(schoolId ? { user: { schoolId } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { totalXp: "desc" },
      take: TOP_N,
    });

    const result = rankings.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      name: entry.user.name,
      image: entry.user.image,
      xp: entry.totalXp,
      difficulty: entry.difficulty,
    }));

    return NextResponse.json(
      {
        success: true,
        rankings: result,
        scope: schoolId ? "school" : "global",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching rune match rankings:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch rankings",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
