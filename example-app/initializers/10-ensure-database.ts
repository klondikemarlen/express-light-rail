import { DATABASE_NAME } from "@example-app/config.js"
import { createMigrationClient } from "@example-app/db/migration-client.js"

export async function ensureDatabase(): Promise<void> {
  const migrationClient = createMigrationClient("postgres")

  try {
    const databases = await migrationClient.raw<{ rows: Array<{ datname: string }> }>(
      "SELECT datname FROM pg_database WHERE datname = ?",
      [DATABASE_NAME]
    )
    if (databases.rows.length > 0) return

    const quotedDatabaseName = `"${DATABASE_NAME.replace(/"/g, '""')}"`
    await migrationClient.raw(`CREATE DATABASE ${quotedDatabaseName}`)
  } finally {
    await migrationClient.destroy()
  }
}
