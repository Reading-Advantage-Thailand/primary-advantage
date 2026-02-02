import { getExportStoryWorkbookController } from "@/server/controllers/storieController";
import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const { storyId } = await context.params;

      const workbookData = await getExportStoryWorkbookController(storyId);

      return NextResponse.json(
        { message: "Workbook exported successfully", data: workbookData },
        { status: 200 },
      );
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["TEACHER_ACCESS"],
);
