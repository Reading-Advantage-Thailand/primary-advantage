import common from "./common";
import en from "./en.json";

const messages = {
  ...en,
  common,
} as const;

export default messages;
