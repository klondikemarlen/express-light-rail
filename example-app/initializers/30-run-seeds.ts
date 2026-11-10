import { NODE_ENV } from "@example-app/config.js"
import { createMigrationClient } from "@example-app/db/migration-client.js"
import { logger } from "@example-app/utils/logger.js"

export async function initialize(environment = NODE_ENV): Promise<void> {
  if (environment !== "development" && environment !== "test" && environment !== "production") {
    throw new Error(`Unsupported seed environment: ${environment}`)
  }

  const migrationClient = createMigrationClient(undefined, environment)
  try {
    await migrationClient.seed.run()
    logger.info("All seeds completed successfully.")
  } catch (error) {
    logger.error("Error running seeds", { error })
    throw error
  } finally {
    await migrationClient.destroy()
  }
}
