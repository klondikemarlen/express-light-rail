import { Sequelize } from "@sequelize/core"
import { SqliteDialect } from "@sequelize/sqlite3"

import { DATABASE_STORAGE } from "@example-app/config.js"

const isInMemoryDatabase = DATABASE_STORAGE === ":memory:"

export const db = new Sequelize({
  dialect: SqliteDialect,

  storage: DATABASE_STORAGE,

  logging: false,

  // In-memory SQLite loses its entire database when its sole connection closes.
  pool: {
    max: 1,
    min: 0,
    acquire: 30_000,
    idle: isInMemoryDatabase ? Infinity : 10_000,
    maxUses: isInMemoryDatabase ? Infinity : 1_000,
  },

  define: {
    timestamps: false,
  },
})
