import { readdir } from "node:fs/promises"
import { extname } from "node:path"
import { fileURLToPath } from "node:url"

import { logger } from "@example-app/utils/logger.js"

export async function initializeApplication(): Promise<void> {
  const directory = new URL("./", import.meta.url)
  const extension = extname(fileURLToPath(import.meta.url))
  const files = await readdir(directory)

  for (const file of files.sort()) {
    if (!/^\d+-/.test(file) || extname(file) !== extension) continue

    const moduleUrl = new URL(file, directory)
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
