import { createServer } from "node:http"

import { app } from "@example-app/app.js"
import { API_PORT } from "@example-app/config.js"
import { initializeApplication } from "@example-app/initializers/index.js"
import { db } from "@example-app/models/index.js"
import { logger } from "@example-app/utils/logger.js"

export const server = createServer(app)

async function start(): Promise<void> {
  await initializeApplication()

  server.listen(API_PORT, () => {
    logger.info(`Express Light Rail discussion board listening on port ${API_PORT}`)
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
