import { NODE_ENV } from "@example-app/config.js"
import migrationClient from "@example-app/db/migration-client.js"
import logger from "@example-app/utils/logger.js"

export async function initialize(): Promise<void> {
  if (NODE_ENV !== "development" && NODE_ENV !== "test" && NODE_ENV !== "production") {
    throw new Error(`Unsupported seed environment: ${NODE_ENV}`)
  }

  try {
    await migrationClient.seed.run()
    logger.info("All seeds completed successfully.")
  } catch (error) {
    logger.error("Error running seeds", { error })
    throw error
  }
}
