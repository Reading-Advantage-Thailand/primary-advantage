import common from "./common";
import games from "./games";
import tw from "./tw.json";
import importAdmin from "./import-admin";
import teachers from "./teachers";

const messages = {
  ...tw,
  common,
  games,
  importAdmin,
  teachers,
} as const;

export default messages;
