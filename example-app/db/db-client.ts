import { Sequelize, type Options } from "@sequelize/core"
import { PostgresDialect } from "@sequelize/postgres"
import minify from "pg-minify"

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
import logger from "@example-app/utils/logger.js"

if (!DATABASE_HOST) throw new Error("database host is unset.")
if (!DATABASE_NAME) throw new Error("database name is unset.")
if (!DATABASE_USERNAME) throw new Error("database username is unset.")
if (!DATABASE_PASSWORD) throw new Error("database password is unset.")

function sqlLogger(query: string): void {
  const compactQuery = minify(query)
  logger.info(compactQuery)
}

export const SEQUELIZE_CONFIG: Options<PostgresDialect> = {
  dialect: PostgresDialect,
  host: DATABASE_HOST,
  port: DATABASE_PORT,
  database: DATABASE_NAME,
  user: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,

  logging: NODE_ENV === "development" ? sqlLogger : false,

  pool: {
    max: DATABASE_POOL_MAXIMUM,
    min: DATABASE_POOL_MINIMUM,
    acquire: DATABASE_POOL_ACQUIRE_TIMEOUT_MILLISECONDS,
    idle: DATABASE_POOL_IDLE_TIMEOUT_MILLISECONDS,
  },

  define: {
    underscored: true,
    timestamps: true,
    paranoid: true,
  },
}

export const db = new Sequelize(SEQUELIZE_CONFIG)
