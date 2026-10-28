import { seed } from "@example-app/db/seeds/development/001.fill-discussion-board.js"

export async function runSeeds(
  environment: string = process.env.NODE_ENV || "development"
): Promise<void> {
  if (environment !== "development" && environment !== "test" && environment !== "production") {
    throw new Error(`Unsupported seed environment: ${environment}`)
  }

  if (environment !== "development") return

  await seed()
}
