import th from "./th.json";
import common from "./common";
import games from "./games";

const messages = {
  ...th,
  common,
  games,
} as const;

export default messages;
