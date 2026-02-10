import { generateAllArticle } from "@/server/controllers/articleController";
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { amountPerGen, source } = await req.json();
    const apiKey = req.headers.get("x-api-key");
    const schedulerApiKey = process.env.ACCESS_KEY;

    if (source === "scheduler" && apiKey === schedulerApiKey) {
      await generateAllArticle(amountPerGen);
    } else if (source === "session" && apiKey === schedulerApiKey) {
      setImmediate(async () => {
        try {
          await generateAllArticle(amountPerGen);
        } catch (error) {
          console.error("Error generating articles:", error);
        }
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
