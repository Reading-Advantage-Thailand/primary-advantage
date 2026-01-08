import { getSRSHealthController } from "@/server/controllers/studentController";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await getSRSHealthController(req, { params });
}




