import cn from "./cn.json";
import common from "./common";
import games from "./games";

const messages = {
  ...cn,
  common,
  games,
} as const;

export default messages;
