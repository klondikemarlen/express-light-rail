import knex from "knex"

import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_POOL_ACQUIRE_TIMEOUT_MILLISECONDS,
  DATABASE_POOL_IDLE_TIMEOUT_MILLISECONDS,
  DATABASE_POOL_MAXIMUM,
  DATABASE_POOL_MINIMUM,
  DATABASE_PORT,
  DATABASE_USERNAME,
  NODE_ENV,
} from "@example-app/config.js"
import {
  resolveDatabaseDirectory,
  resolveSeedDirectories,
} from "@example-app/db/extensions/resolve-database-directories.js"
import { determineRuntimeLoadExtensions } from "@example-app/db/extensions/determine-runtime-load-extensions.js"

const migrationClient = knex({
  client: "pg",
  connection: {
    host: DATABASE_HOST,
    port: DATABASE_PORT,
    database: DATABASE_NAME,
    user: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
  },
  acquireConnectionTimeout: DATABASE_POOL_ACQUIRE_TIMEOUT_MILLISECONDS,
  pool: {
    max: DATABASE_POOL_MAXIMUM,
    min: DATABASE_POOL_MINIMUM,
    idleTimeoutMillis: DATABASE_POOL_IDLE_TIMEOUT_MILLISECONDS,
  },
  migrations: {
    directory: resolveDatabaseDirectory(import.meta.url, "./migrations/"),
    loadExtensions: determineRuntimeLoadExtensions(import.meta.url),
  },
  seeds: {
    directory: resolveSeedDirectories(import.meta.url, NODE_ENV),
    loadExtensions: determineRuntimeLoadExtensions(import.meta.url),
  },
})

export default migrationClient
