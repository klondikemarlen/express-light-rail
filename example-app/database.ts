import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import { Sequelize } from "@sequelize/core"
import { SqliteDialect } from "@sequelize/sqlite3"

const storage =
  process.env.EXAMPLE_DATABASE_STORAGE || resolve(".example-app/discussion-board.sqlite")

export const sequelize = new Sequelize({
  dialect: SqliteDialect,

  storage,

  logging: false,

  pool: {
    max: 1,
    idle: Infinity,
    maxUses: Infinity,
  },
})

export async function ensureDatabaseDirectory(): Promise<void> {
  if (storage !== ":memory:") {
    await mkdir(dirname(resolve(storage)), {
      recursive: true,
    })
  }
}
