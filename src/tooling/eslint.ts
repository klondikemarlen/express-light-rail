import eslint from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import tseslint, { type ConfigArray, type ConfigWithExtends } from "typescript-eslint"

export function createEslintConfig(...overrides: ConfigWithExtends[]): ConfigArray {
  return tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    eslintConfigPrettier,
    {
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            args: "all",
            argsIgnorePattern: "^_",
            caughtErrors: "all",
            caughtErrorsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            ignoreRestSiblings: true,
          },
        ],
      },
    },
    ...overrides
  )
}
