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

const extension = extname(fileURLToPath(import.meta.url))
const seedDirectories = []
if (NODE_ENV === "development") {
  seedDirectories.push(fileURLToPath(new URL("./seeds/development/", import.meta.url)))
}

export const migrationClient = knex({
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
    loadExtensions: [extension],
  },
  seeds: {
    directory: seedDirectories,
    loadExtensions: [extension],
  },
})
