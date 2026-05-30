import { withAuth } from "@/server/utils/middleware";
import {
  listProvidersController,
  createProviderController,
} from "@/server/controllers/aiConfigController";

export const GET = withAuth(
  async (req) => {
    return listProvidersController(req);
  },
  ["SYSTEM_ACCESS"],
);

export const POST = withAuth(
  async (req) => {
    return createProviderController(req);
  },
  ["SYSTEM_ACCESS"],
);
