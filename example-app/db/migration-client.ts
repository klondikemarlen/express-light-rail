import { knex, type Knex } from "knex"

import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_TRUST_SERVER_CERTIFICATE,
  DATABASE_USERNAME,
} from "@example-app/config.js"

export function createMigrationClient(databaseName = DATABASE_NAME): Knex {
  return knex({
    client: "mssql",
    connection: {
      host: DATABASE_HOST,
      port: DATABASE_PORT,
      database: databaseName,
      user: DATABASE_USERNAME,
      password: DATABASE_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: DATABASE_TRUST_SERVER_CERTIFICATE,
      },
    },
    acquireConnectionTimeout: 30_000,
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 10_000,
    },
  })
}
