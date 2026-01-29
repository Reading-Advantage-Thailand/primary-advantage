import common from "./common";
import vi from "./vi.json";

const messages = {
  ...vi,
  common,
} as const;

export default messages;
