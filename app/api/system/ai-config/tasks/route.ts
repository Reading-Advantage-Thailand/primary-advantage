import { withAuth } from "@/server/utils/middleware";
import { listTasksController } from "@/server/controllers/aiConfigController";

export const GET = withAuth(
  async (req) => {
    return listTasksController(req);
  },
  ["SYSTEM_ACCESS"],
);
