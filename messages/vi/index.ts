import common from "./common";
import games from "./games";
import vi from "./vi.json";
import importAdmin from "./import-admin";

const messages = {
  ...vi,
  common,
  games,
  importAdmin,
} as const;

export default messages;
