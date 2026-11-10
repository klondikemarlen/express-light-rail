import { createMigrationClient } from "@example-app/db/migration-client.js"
import { logger } from "@example-app/utils/logger.js"

type MigrationInfo = {
  file: string
  directory: string
}

export async function initialize(): Promise<void> {
  const migrationClient = createMigrationClient()

  try {
    const [_completedMigrations, pendingMigrations]: [MigrationInfo[], MigrationInfo[]] =
      await migrationClient.migrate.list()

    if (pendingMigrations.length === 0) {
      logger.info("No pending migrations.")
      return
    }

    for (const { file, directory } of pendingMigrations) {
      logger.info(`Running migration: ${directory}/${file}`)
      await migrationClient.migrate.up()
    }

    logger.info("All migrations completed successfully.")
  } catch (error) {
    logger.error("Error running migrations", { error })
    throw error
  } finally {
    await migrationClient.destroy()
  }
}
