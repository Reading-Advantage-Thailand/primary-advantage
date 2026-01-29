import th from "./th.json";
import common from "./common";

const messages = {
  ...th,
  common,
} as const;

export default messages;
