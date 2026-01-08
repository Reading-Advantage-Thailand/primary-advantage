import { getVelocityMetricsController } from "@/server/controllers/studentController";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return await getVelocityMetricsController(request);
}




