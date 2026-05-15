import { withAuth } from "@/server/utils/middleware";
import {
  updateContactMessageStatusController,
  deleteContactMessageController,
} from "@/server/controllers/systemContactController";

export const PATCH = withAuth(
  async (req, context) => {
    const { id } = await context.params;
    return updateContactMessageStatusController(req, id as string);
  },
  ["SYSTEM_ACCESS"],
);

export const DELETE = withAuth(
  async (req, context) => {
    const { id } = await context.params;
    return deleteContactMessageController(req, id as string);
  },
  ["SYSTEM_ACCESS"],
);
