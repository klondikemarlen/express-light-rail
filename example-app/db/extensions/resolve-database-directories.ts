import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

/**
 * Resolves a database directory beside the calling module rather than the
 * working directory. Native ESM has no __dirname; this preserves the source
 * or compiled module's location when resolving migrations and seeds.
 */
export function resolveDatabaseDirectory(moduleUrl: string, relativeDirectory: string): string {
  return fileURLToPath(new URL(relativeDirectory, moduleUrl))
}

/**
 * Selects only the current environment's seeds. An absent directory means
 * there are no seeds for that environment; compilation does not emit empty
 * directories. Migration discovery must not use this optional-directory rule.
 */
export function resolveSeedDirectories(moduleUrl: string, environment: string): string[] {
  const directory = resolveDatabaseDirectory(moduleUrl, `./seeds/${environment}/`)
  return existsSync(directory) ? [directory] : []
}
