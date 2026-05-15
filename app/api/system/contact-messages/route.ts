import { withAuth } from "@/server/utils/middleware";
import { listContactMessages } from "@/server/controllers/systemContactController";

export const GET = withAuth(
  async (req) => {
    return listContactMessages(req);
  },
  ["SYSTEM_ACCESS"],
);
