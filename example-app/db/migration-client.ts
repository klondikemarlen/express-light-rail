import { extname } from "node:path"
import { fileURLToPath } from "node:url"

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
import { resolveSeedDirectories } from "@example-app/db/extensions/resolve-seed-directories.js"

// Match source or compiled migrations and seeds to this module's runtime.
// The .ts filter also matches .d.ts; neither filter compiles files.
const loadExtensions = [extname(fileURLToPath(import.meta.url))]

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
    directory: fileURLToPath(new URL("./migrations/", import.meta.url)),
    loadExtensions,
  },
  seeds: {
    directory: resolveSeedDirectories(import.meta.url, NODE_ENV),
    loadExtensions,
  },
})

export default migrationClient
