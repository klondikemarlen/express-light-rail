import { extname } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Restricts Knex migration and seed discovery to the calling module's runtime
 * extension: .ts when executing source, or .js when executing compiled output.
 * This prevents loading both source and compiled copies when they coexist and
 * excludes source maps. The .js filter also excludes generated declarations;
 * the .ts filter does not distinguish .d.ts files from executable TypeScript.
 * This selects files only; the runtime must already support their format.
 */
export function getRuntimeLoadExtensions(moduleUrl: string): string[] {
  return [extname(fileURLToPath(moduleUrl))]
}
