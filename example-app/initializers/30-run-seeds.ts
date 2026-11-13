import migrationClient from "@example-app/db/migration-client.js"
import logger from "@example-app/utils/logger.js"

export async function initialize(): Promise<void> {
  try {
    await migrationClient.seed.run()
    logger.info("All seeds completed successfully.")
  } catch (error) {
    logger.error("Error running seeds", { error })
    throw error
  }
}
