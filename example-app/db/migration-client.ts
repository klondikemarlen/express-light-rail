import { extname } from "node:path"
import { fileURLToPath } from "node:url"

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
  NODE_ENV,
} from "@example-app/config.js"

export function createMigrationClient(databaseName = DATABASE_NAME, environment = NODE_ENV): Knex {
  const extension = extname(fileURLToPath(import.meta.url))
  const seedDirectories = []
  if (environment === "development") {
    seedDirectories.push(fileURLToPath(new URL(`./seeds/${environment}/`, import.meta.url)))
  }

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
    migrations: {
      directory: fileURLToPath(new URL("./migrations/", import.meta.url)),
      loadExtensions: [extension],
    },
    seeds: {
      directory: seedDirectories,
      loadExtensions: [extension],
    },
  })
}
