import { Sequelize } from "@sequelize/core"
import { SqliteDialect } from "@sequelize/sqlite3"

import { DATABASE_STORAGE } from "@example-app/config.js"

export const db = new Sequelize({
  dialect: SqliteDialect,

  storage: DATABASE_STORAGE,

  logging: false,

  pool: {
    max: 1,
    idle: Infinity,
    maxUses: Infinity,
  },

  define: {
    timestamps: false,
  },
})
