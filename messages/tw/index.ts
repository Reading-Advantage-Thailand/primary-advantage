import common from "./common";
import games from "./games";
import tw from "./tw.json";
import importAdmin from "./import-admin";

const messages = {
  ...tw,
  common,
  games,
  importAdmin,
} as const;

export default messages;
