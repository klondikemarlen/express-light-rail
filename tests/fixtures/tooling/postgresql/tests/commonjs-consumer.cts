import type { Config } from "prettier"

import { BaseController, BaseService } from "express-light-rail"
import { createEslintConfig } from "express-light-rail/tooling/eslint"
import { prettierConfig } from "express-light-rail/tooling/prettier"
import { createVitestConfig } from "express-light-rail/tooling/vitest"

class LabelService extends BaseService<string> {
  constructor(private readonly label: string) {
    super()
  }

  perform(): string {
    return this.label
  }
}

const label: string = LabelService.perform("ready")
const controllerClass: typeof BaseController = BaseController
const lint = createEslintConfig({ rules: { "no-debugger": "off" } })
const format: Config = { ...prettierConfig, printWidth: 80 }
const runner = createVitestConfig({ test: { globals: false } })

// @ts-expect-error CommonJS constructor arguments must retain their public types.
LabelService.perform(123)

// @ts-expect-error Native runner configuration flags remain typed.
createVitestConfig({ test: { globals: "false" } })

void [label, controllerClass, lint, format, runner]
