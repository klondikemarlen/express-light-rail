import { Sequelize, type Options } from "@sequelize/core"
import { PostgresDialect } from "@sequelize/postgres"

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
import { logger } from "@example-app/utils/logger.js"

if (!DATABASE_HOST.trim()) throw new Error("database host is unset.")
if (!DATABASE_NAME.trim()) throw new Error("database name is unset.")
if (!DATABASE_USERNAME.trim()) throw new Error("database username is unset.")
if (!DATABASE_PASSWORD) throw new Error("database password is unset.")

export const SEQUELIZE_CONFIG: Options<PostgresDialect> = {
  dialect: PostgresDialect,
  host: DATABASE_HOST,
  port: DATABASE_PORT,
  database: DATABASE_NAME,
  user: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,

  logging: NODE_ENV === "development" ? (query) => logger.info(query) : false,

  pool: {
    max: DB_POOL_MAX,
    min: DB_POOL_MIN,
    acquire: DB_POOL_ACQUIRE_MS,
    idle: DB_POOL_IDLE_MS,
  },

  define: {
    underscored: true,
    timestamps: true,
    paranoid: true,
  },
}

export const db = new Sequelize(SEQUELIZE_CONFIG)
