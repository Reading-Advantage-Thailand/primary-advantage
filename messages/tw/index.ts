import common from "./common";
import tw from "./tw.json";

const messages = {
  ...tw,
  common,
} as const;

export default messages;
