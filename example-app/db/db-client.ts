import { Sequelize } from "@sequelize/core"
import { MsSqlDialect } from "@sequelize/mssql"

import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_TRUST_SERVER_CERTIFICATE,
  DATABASE_USERNAME,
} from "@example-app/config.js"

export const db = new Sequelize({
  dialect: MsSqlDialect,
  server: DATABASE_HOST,
  port: DATABASE_PORT,
  database: DATABASE_NAME,
  authentication: {
    type: "default",
    options: {
      userName: DATABASE_USERNAME,
      password: DATABASE_PASSWORD,
    },
  },
  schema: "dbo",
  encrypt: true,
  trustServerCertificate: DATABASE_TRUST_SERVER_CERTIFICATE,

  logging: false,

  pool: {
    max: 5,
    min: 0,
    acquire: 30_000,
    idle: 10_000,
  },

  define: {
    timestamps: false,
  },
})
