import knex from "knex"

import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USERNAME,
} from "@example-app/config.js"
import { logger } from "@example-app/utils/logger.js"

export async function initialize(): Promise<void> {
  const migrationClient = knex({
    client: "pg",
    connection: {
      host: DATABASE_HOST,
      port: DATABASE_PORT,
      database: "postgres",
      user: DATABASE_USERNAME,
      password: DATABASE_PASSWORD,
    },
  })

  try {
    const databases = await migrationClient.raw<{ rows: unknown[] }>(
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
