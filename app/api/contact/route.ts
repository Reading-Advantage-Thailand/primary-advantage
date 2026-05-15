import { NextRequest } from "next/server";
import { submitContactMessage } from "@/server/controllers/contactController";

export async function POST(request: NextRequest) {
  return submitContactMessage(request);
}
