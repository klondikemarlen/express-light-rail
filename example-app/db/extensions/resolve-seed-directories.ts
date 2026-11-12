import { existsSync } from "node:fs"

import { resolveDatabaseDirectory } from "@example-app/db/extensions/resolve-database-directory.js"

/**
 * Selects only the current environment's seeds. An absent directory means
 * there are no seeds for that environment; compilation does not emit empty
 * directories. Migration discovery must not use this optional-directory rule.
 */
export function resolveSeedDirectories(moduleUrl: string, environment: string): string[] {
  const directory = resolveDatabaseDirectory(moduleUrl, `./seeds/${environment}/`)
  return existsSync(directory) ? [directory] : []
}
