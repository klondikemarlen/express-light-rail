import knex, { type Knex } from "knex"

import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USERNAME,
  DB_POOL_ACQUIRE_MS,
  DB_POOL_IDLE_MS,
  DB_POOL_MAX,
  DB_POOL_MIN,
} from "@example-app/config.js"

export function createMigrationClient(databaseName = DATABASE_NAME): Knex {
  return knex({
    client: "pg",
    connection: {
      host: DATABASE_HOST,
      port: DATABASE_PORT,
      database: databaseName,
      user: DATABASE_USERNAME,
      password: DATABASE_PASSWORD,
    },
    acquireConnectionTimeout: DB_POOL_ACQUIRE_MS,
    pool: {
      max: DB_POOL_MAX,
      min: DB_POOL_MIN,
      idleTimeoutMillis: DB_POOL_IDLE_MS,
    },
  })
}
