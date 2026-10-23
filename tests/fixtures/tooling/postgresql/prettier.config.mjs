import { prettierConfig } from "express-light-rail/tooling/prettier"

export default {
  ...prettierConfig,
  plugins: ["prettier-plugin-sql"],
  language: "postgresql",
}
