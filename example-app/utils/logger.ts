import { createLogger, format, transports } from "winston"

import { DEFAULT_LOG_LEVEL } from "@example-app/config.js"

export const logger = createLogger({
  level: DEFAULT_LOG_LEVEL,
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
})
