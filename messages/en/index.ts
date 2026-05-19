import common from "./common";
import en from "./en.json";
import games from "./games";
import importAdmin from "./import-admin";
import teachers from "./teachers";

const messages = {
  ...en,
  common,
  games,
  importAdmin,
  teachers,
} as const;

export default messages;
