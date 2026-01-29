import cn from "./cn.json";
import common from "./common";

const messages = {
  ...cn,
  common,
} as const;

export default messages;
