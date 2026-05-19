import common from "./common";
import games from "./games";
import vi from "./vi.json";
import importAdmin from "./import-admin";
import teachers from "./teachers";

const messages = {
  ...vi,
  common,
  games,
  importAdmin,
  teachers,
} as const;

export default messages;
