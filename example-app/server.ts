import { app } from "@example-app/app.js"
import { configuration } from "@example-app/configuration.js"
import { logger } from "@example-app/logger.js"
import { initializeApplication } from "@example-app/initializers/index.js"
import { db } from "@example-app/models/index.js"

async function start(): Promise<void> {
  await initializeApplication()

  const port = Number(process.env.API_PORT ?? 3000)
  const server = app.listen(port, () => {
    logger.info(`Express Light Rail discussion board listening on port ${port}`)
    if (configuration.authentication.mode === "demo") {
      logger.warn("Demo identity selection is enabled; use Auth0 mode before exposing the example")
    }
  })

  function stop(): void {
    server.close(() => {
      void db.close()
    })
  }

  process.once("SIGINT", stop)
  process.once("SIGTERM", stop)
}

start().catch(async (error: unknown) => {
  logger.error("Could not start the discussion board", {
    error,
  })
  await db.close()
  process.exitCode = 1
})
