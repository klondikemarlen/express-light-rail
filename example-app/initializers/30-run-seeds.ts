import { seedsByEnvironment } from "@example-app/db/seeds/index.js"

export async function runSeeds(
  environment: string = process.env.NODE_ENV || "development"
): Promise<void> {
  if (environment !== "development" && environment !== "test" && environment !== "production") {
    throw new Error(`Unsupported seed environment: ${environment}`)
  }

  for (const seed of seedsByEnvironment[environment]) {
    await seed()
  }
}
