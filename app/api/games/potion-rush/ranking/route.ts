import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOP_N = 20;
const DIFFICULTIES = ["EASY", "NORMAL", "HARD", "EXTREME"];

export const GET = withAuth(async (req, context, user) => {
  try {
    const { schoolId } = user;

    // Fetch top rankings for all difficulties at once
    const allRankings = await prisma.gameRanking.findMany({
      where: {
        gameType: "POTION_RUSH",
        difficulty: { in: DIFFICULTIES },
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
    });

    // Group by difficulty and take top N per group
    const rankings: Record<
      string,
      Array<{
        rank: number;
        userId: string;
        name: string | null;
        image: string | null;
        xp: number;
      }>
    > = {};

    for (const dif of DIFFICULTIES) {
      const key = dif.toLowerCase();
      const entries = allRankings
        .filter((r) => r.difficulty === dif)
        .slice(0, TOP_N);

      rankings[key] = entries.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        name: entry.user.name,
        image: entry.user.image,
        xp: entry.totalXp,
      }));
    }

    return NextResponse.json(
      {
        success: true,
        rankings,
        scope: schoolId ? "school" : "global",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching potion rush rankings:", error);
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
