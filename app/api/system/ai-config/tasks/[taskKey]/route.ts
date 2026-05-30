import { withAuth } from "@/server/utils/middleware";
import { updateTaskController } from "@/server/controllers/aiConfigController";

export const PATCH = withAuth(
  async (req, context, user) => {
    const { taskKey } = await context.params;
    return updateTaskController(req, taskKey as string, user);
  },
  ["SYSTEM_ACCESS"],
);
