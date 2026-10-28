import { extname } from "node:path"
import { fileURLToPath } from "node:url"

import { createMigrationClient } from "@example-app/db/migration-client.js"

export async function runMigrations(): Promise<void> {
  const migrationClient = createMigrationClient()
  const extension = extname(fileURLToPath(import.meta.url))

  try {
    await migrationClient.migrate.latest({
      directory: fileURLToPath(new URL("../db/migrations/", import.meta.url)),
      loadExtensions: [extension],
    })
  } finally {
    await migrationClient.destroy()
  }
}
