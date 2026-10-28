import { ensureDatabase } from "@example-app/initializers/10-ensure-database.js"
import { runMigrations } from "@example-app/initializers/20-run-migrations.js"
import { runSeeds } from "@example-app/initializers/30-run-seeds.js"

export async function initializeApplication(): Promise<void> {
  await ensureDatabase()
  await runMigrations()
  await runSeeds()
}
