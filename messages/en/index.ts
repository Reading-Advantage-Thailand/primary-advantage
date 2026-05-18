import common from "./common";
import en from "./en.json";
import games from "./games";
import importAdmin from "./import-admin";

const messages = {
  ...en,
  common,
  games,
  importAdmin,
} as const;

export default messages;
