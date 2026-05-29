import { NextRequest, NextResponse } from "next/server";
import { generateClassCodeController } from "@/server/controllers/classroomController";

/**
 * Generates a new class code for a classroom.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await generateClassCodeController(req, { params });
}

