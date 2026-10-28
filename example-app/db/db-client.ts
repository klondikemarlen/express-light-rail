import { resolve } from "node:path"

import { Sequelize } from "@sequelize/core"
import { SqliteDialect } from "@sequelize/sqlite3"

export const databaseStorage =
  process.env.EXAMPLE_DATABASE_STORAGE || resolve(".example-app/discussion-board.sqlite")

export const db = new Sequelize({
  dialect: SqliteDialect,

  storage: databaseStorage,

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
