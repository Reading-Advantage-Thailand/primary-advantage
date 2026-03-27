import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOP_N = 20;
const DIFFICULTIES = ["SLIME", "GOBLIN", "SPECTRE", "ELEMENTAL"];

export const GET = withAuth(async (req, _context, user) => {
  try {
    // Scope to same school when user belongs to one; otherwise global
    const { schoolId } = user;

    const rankings = await prisma.gameRanking.findMany({
      where: {
        gameType: "RPG_BATTLE",
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
    console.error("Error fetching RPG Battle rankings:", error);
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
