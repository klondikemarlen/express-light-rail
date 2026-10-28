import { DATABASE_NAME } from "@example-app/config.js"
import { createMigrationClient } from "@example-app/db/migration-client.js"

export async function ensureDatabase(): Promise<void> {
  const migrationClient = createMigrationClient("master")

  try {
    const databases = await migrationClient.raw<Array<{ name: string }>>(
      "SELECT name FROM sys.databases WHERE name = ?",
      [DATABASE_NAME]
    )
    if (databases.length > 0) return

    const quotedDatabaseName = `[${DATABASE_NAME.replace(/]/g, "]]")}]`
    await migrationClient.raw(`CREATE DATABASE ${quotedDatabaseName}`)
  } finally {
    await migrationClient.destroy()
  }
}
