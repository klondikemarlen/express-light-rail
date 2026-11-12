import { existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Resolves database directories beside the calling module, not the process's
 * working directory, so source and compiled startup use their own files.
 * Shared migrations always run in every environment; an environment directory
 * adds migrations after them. Seeds load only from their environment directory.
 * Environment directories are optional: omit them when no environment-specific
 * files exist, including when compilation produces no directory for empty input.
 * The shared migration directory is required and is left for Knex to validate.
 */
export function getDatabaseDirectories(
  moduleUrl: string,
  kind: "migrations" | "seeds",
  environment: string
): string[] {
  const sharedDirectory = fileURLToPath(new URL(`./${kind}/`, moduleUrl))
  const environmentDirectory = join(sharedDirectory, environment)
  const directories = kind === "migrations" ? [sharedDirectory] : []

  if (existsSync(environmentDirectory)) {
    directories.push(environmentDirectory)
  }

  return directories
}
