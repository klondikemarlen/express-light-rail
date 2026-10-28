import { app } from "@example-app/app.js"
import { configuration } from "@example-app/configuration.js"
import { sequelize } from "@example-app/database.js"
import { logger } from "@example-app/logger.js"
import { initializeDatabase } from "@example-app/models/index.js"
import { seedDatabase } from "@example-app/seed.js"

async function start(): Promise<void> {
  await initializeDatabase()
  await seedDatabase()

  const port = Number(process.env.API_PORT ?? 3000)
  const server = app.listen(port, () => {
    logger.info(`Express Light Rail discussion board listening on port ${port}`)
    if (configuration.authentication.mode === "demo") {
      logger.warn("Demo identity selection is enabled; use Auth0 mode before exposing the example")
    }
  })

  function stop(): void {
    server.close(() => {
      void sequelize.close()
    })
  }

  process.once("SIGINT", stop)
  process.once("SIGTERM", stop)
}

start().catch(async (error: unknown) => {
  logger.error("Could not start the discussion board", {
    error,
  })
  await sequelize.close()
  process.exitCode = 1
})
