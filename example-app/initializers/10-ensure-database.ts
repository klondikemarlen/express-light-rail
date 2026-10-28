import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import { databaseStorage } from "@example-app/db/db-client.js"
import { db } from "@example-app/models/index.js"

export async function ensureDatabase(): Promise<void> {
  if (databaseStorage !== ":memory:") {
    await mkdir(dirname(resolve(databaseStorage)), {
      recursive: true,
    })
  }

  await db.sync()
}
