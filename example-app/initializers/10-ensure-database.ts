import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import { DATABASE_STORAGE } from "@example-app/config.js"
import { db } from "@example-app/models/index.js"

export async function ensureDatabase(): Promise<void> {
  if (DATABASE_STORAGE !== ":memory:") {
    await mkdir(dirname(resolve(DATABASE_STORAGE)), {
      recursive: true,
    })
  }

  await db.sync()
}
