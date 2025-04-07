import logger from "@/utils/logger.js"

function setLogLevel(level: string) {
  logger.level = level
}

export const testWithCustomLogLevel = test.extend<{
  setLogLevel: (level: string) => void
}>({
  // eslint-disable-next-line no-empty-pattern
  setLogLevel: async ({}, use) => {
    const originalLogLevel = logger.level
    try {
      await use(setLogLevel)
    } finally {
      setLogLevel(originalLogLevel)
    }
  },
})
