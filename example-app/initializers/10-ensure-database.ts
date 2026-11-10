import { DATABASE_NAME } from "@example-app/config.js"
import { createMigrationClient } from "@example-app/db/migration-client.js"
import { logger } from "@example-app/utils/logger.js"

export async function initialize(): Promise<void> {
  const migrationClient = createMigrationClient("postgres")

  try {
    const databases = await migrationClient.raw<{ rows: Array<{ datname: string }> }>(
      "SELECT 1 FROM pg_database WHERE datname = ?",
      [DATABASE_NAME]
    )
    if (databases.rows.length > 0) return

    logger.info(`Database ${DATABASE_NAME} does not exist: creating...`)
    await migrationClient.raw("CREATE DATABASE ??", [DATABASE_NAME])
  } catch (error) {
    logger.error("Failed to create database", { error })
    throw error
  } finally {
    await migrationClient.destroy()
  }
}
