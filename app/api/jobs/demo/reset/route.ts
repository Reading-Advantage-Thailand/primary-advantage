import { resetDemoDateSeed } from "@/prisma/demo-seed";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");

    if (!apiKey || apiKey !== process.env.ACCESS_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Perform reset logic here

    const result = await resetDemoDateSeed();

    if (result.success) {
      return NextResponse.json(
        { message: "Demo data reset successfully." },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { error: "Failed to reset demo data." },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "An error occurred while processing the request." },
      { status: 500 },
    );
  }
}
