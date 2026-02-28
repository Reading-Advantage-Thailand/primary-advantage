import common from "./common";
import en from "./en.json";
import games from "./games";

const messages = {
  ...en,
  common,
  games,
} as const;

export default messages;
