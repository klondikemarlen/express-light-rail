import { app } from "@example-app/app.js"
import { sequelize } from "@example-app/database.js"
import { initializeDatabase } from "@example-app/models/index.js"
import { seedDatabase } from "@example-app/seed.js"

async function start(): Promise<void> {
  await initializeDatabase()
  await seedDatabase()

  const port = Number(process.env.API_PORT ?? 3000)
  const server = app.listen(port, () => {
    process.stdout.write(`Express Light Rail discussion board listening on port ${port}\n`)
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
  process.stderr.write(`Could not start the discussion board: ${String(error)}\n`)
  await sequelize.close()
  process.exitCode = 1
})
