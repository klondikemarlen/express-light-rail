import { DATABASE_NAME, NODE_ENV } from "@example-app/config.js"
import { migrationClient } from "@example-app/db/migration-client.js"
import { initialize as ensureDatabase } from "@example-app/initializers/10-ensure-database.js"
import { initialize as runMigrations } from "@example-app/initializers/20-run-migrations.js"
import { db, Comment, Thread, User } from "@example-app/models/index.js"

function assertTestDatabase(): void {
  if (NODE_ENV !== "test" || !DATABASE_NAME.endsWith("_test")) {
    throw new Error("Example database tests require NODE_ENV=test and a DB_NAME ending in _test")
  }
}

export async function prepareExampleDatabase(): Promise<void> {
  assertTestDatabase()

  await ensureDatabase()
  await runMigrations()
}

export async function cleanExampleDatabase(): Promise<void> {
  assertTestDatabase()

  await Comment.destroy({ where: {}, force: true })
  await Thread.destroy({ where: {}, force: true })
  await User.destroy({ where: {}, force: true })
}

export async function closeExampleDatabase(): Promise<void> {
  await migrationClient.destroy()
  await db.close()
}
