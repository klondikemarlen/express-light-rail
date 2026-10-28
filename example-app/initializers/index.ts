import { ensureDatabase } from "@example-app/initializers/10-ensure-database.js"
import { runSeeds } from "@example-app/initializers/30-run-seeds.js"

export async function initializeApplication(): Promise<void> {
  await ensureDatabase()
  await runSeeds()
}
