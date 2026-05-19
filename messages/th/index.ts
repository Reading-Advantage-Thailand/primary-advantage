import th from "./th.json";
import common from "./common";
import games from "./games";
import importAdmin from "./import-admin";
import teachers from "./teachers";

const messages = {
  ...th,
  common,
  games,
  importAdmin,
  teachers,
} as const;

export default messages;
