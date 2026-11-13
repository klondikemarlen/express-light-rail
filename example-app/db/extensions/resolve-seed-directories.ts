import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

/**
 * Selects only the current environment's seeds. An absent directory means
 * there are no seeds for that environment; compilation does not emit empty
 * directories. Migration discovery must not use this optional-directory rule.
 */
export function resolveSeedDirectories(moduleUrl: string, environment: string): string[] {
  const directory = fileURLToPath(new URL(`./seeds/${environment}/`, moduleUrl))
  return existsSync(directory) ? [directory] : []
}
