import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  {
    extends: ["next/core-web-vitals"],
    rules: {
      // Add any custom rules here if needed
    },
  },
];
