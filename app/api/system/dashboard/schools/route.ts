import { fetchSchoolsListController } from "@/server/controllers/schoolController";
import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";

export const GET = withAuth(
  async (req, context, user) => {
    try {
      const schools = await fetchSchoolsListController();
      return NextResponse.json(schools, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        {
          status: 500,
        },
      );
    }
  },
  ["SYSTEM_ACCESS"],
);
