import common from "./common";
import games from "./games";
import vi from "./vi.json";

const messages = {
  ...vi,
  common,
  games,
} as const;

export default messages;
