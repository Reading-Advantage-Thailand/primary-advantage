import th from "./th.json";
import common from "./common";
import games from "./games";
import importAdmin from "./import-admin";

const messages = {
  ...th,
  common,
  games,
  importAdmin,
} as const;

export default messages;
