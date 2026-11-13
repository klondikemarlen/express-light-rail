import { readdir } from "node:fs/promises"
import { extname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import logger from "@example-app/utils/logger.js"

export async function importAndExecuteInitializers(initializersPath: string): Promise<void> {
  const extension = extname(fileURLToPath(import.meta.url))
  const files = await readdir(initializersPath)

  for (const file of files.sort()) {
    if (!/^\d+-/.test(file) || extname(file) !== extension) continue

    const moduleUrl = pathToFileURL(join(initializersPath, file))
    logger.info(`Running initializer: ${file}`)

    try {
      // Initializer modules are discovered from the runtime directory.
      const { initialize } = await import(moduleUrl.href)
      await initialize()
    } catch (error) {
      logger.error(`Failed to run initializer: ${file}`, { error })
      throw error
    }
  }
}
