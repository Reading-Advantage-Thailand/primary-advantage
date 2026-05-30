import { withAuth } from "@/server/utils/middleware";
import {
  updateProviderController,
  deleteProviderController,
} from "@/server/controllers/aiConfigController";

export const PATCH = withAuth(
  async (req, context) => {
    const { id } = await context.params;
    return updateProviderController(req, id as string);
  },
  ["SYSTEM_ACCESS"],
);

export const DELETE = withAuth(
  async (req, context) => {
    const { id } = await context.params;
    return deleteProviderController(req, id as string);
  },
  ["SYSTEM_ACCESS"],
);
