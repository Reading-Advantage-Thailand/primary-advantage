import { NextResponse } from "next/server";
import { fetchStudentHeatmapApi } from "@/utils/api-request";
import { withAuth } from "@/server/utils/middleware";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const studentId = (await context.params).id;
      const heatmapData = await fetchStudentHeatmapApi(studentId);
      return NextResponse.json(heatmapData, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["STUDENT_ACCESS"],
);
