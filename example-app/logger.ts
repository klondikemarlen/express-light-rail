import { createLogger, format, transports } from "winston"

export const logger = createLogger({
  level: process.env.EXAMPLE_LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
})
