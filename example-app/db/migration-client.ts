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
import { getDatabaseDirectories } from "@example-app/db/extensions/get-database-directories.js"
import { getRuntimeLoadExtensions } from "@example-app/db/extensions/get-runtime-load-extensions.js"

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
    directory: getDatabaseDirectories(import.meta.url, "migrations", NODE_ENV),
    loadExtensions: getRuntimeLoadExtensions(import.meta.url),
    sortDirsSeparately: true,
  },
  seeds: {
    directory: getDatabaseDirectories(import.meta.url, "seeds", NODE_ENV),
    loadExtensions: getRuntimeLoadExtensions(import.meta.url),
  },
})

export default migrationClient
