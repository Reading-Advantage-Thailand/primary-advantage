import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { submitSAQController } from "@/server/controllers/storyQuizController";

export const POST = withAuth(async (req, context, user) => {
  try {
    const result = await submitSAQController(req, user);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error submitting SAQ:", error);
    return NextResponse.json(
      { error: "Failed to submit SAQ" },
      { status: 500 },
    );
  }
});
