import common from "./common";
import games from "./games";
import tw from "./tw.json";

const messages = {
  ...tw,
  common,
  games,
} as const;

export default messages;
