import { fileURLToPath } from "node:url"

/**
 * Resolves a database directory beside the calling module rather than the
 * working directory. Native ESM has no __dirname; this preserves the source
 * or compiled module's location when resolving migrations and seeds.
 */
export function resolveDatabaseDirectory(moduleUrl: string, relativeDirectory: string): string {
  return fileURLToPath(new URL(relativeDirectory, moduleUrl))
}
