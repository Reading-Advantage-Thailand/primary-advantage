import { generateExportWorkbook } from "@/server/controllers/articleController";
import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const { articleId } = await context.params;
      const { searchParams } = new URL(req.url);
      const type = searchParams.get("type");

      const workbookData =
        type === "article" ? await generateExportWorkbook(articleId) : null;

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
