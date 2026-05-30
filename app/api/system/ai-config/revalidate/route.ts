import { withAuth } from "@/server/utils/middleware";
import { revalidateController } from "@/server/controllers/aiConfigController";

export const POST = withAuth(
  async (req) => {
    return revalidateController(req);
  },
  ["SYSTEM_ACCESS"],
);
