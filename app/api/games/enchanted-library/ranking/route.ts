import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOP_N = 20;
const DIFFICULTIES = ["EASY", "NORMAL", "HARD", "EXTREME"];

export const GET = withAuth(async (req, _context, user) => {
  try {
    const { schoolId } = user;

    // Fetch rankings for all difficulties in one query
    const rankings = await prisma.gameRanking.findMany({
      where: {
        gameType: "ENCHANTED_LIBRARY",
        difficulty: { in: DIFFICULTIES },
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
    });

    // Group by difficulty and take top N per group
    const grouped: Record<
      string,
      { userId: string; name: string; image: string | null; xp: number }[]
    > = {};

    for (const diff of DIFFICULTIES) {
      const key = diff.toLowerCase();
      grouped[key] = rankings
        .filter((entry) => entry.difficulty === diff)
        .slice(0, TOP_N)
        .map((entry) => ({
          userId: entry.userId,
          name: entry.user.name ?? "Unknown",
          image: entry.user.image,
          xp: entry.totalXp,
        }));
    }

    return NextResponse.json(
      {
        success: true,
        rankings: grouped,
        scope: schoolId ? "school" : "global",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching Enchanted Library rankings:", error);
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
