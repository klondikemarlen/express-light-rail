import { createLogger, format, transports } from "winston"

export const DEFAULT_LOG_LEVEL = process.env.DEFAULT_LOG_LEVEL || "debug"

export const consoleLogger = createLogger({
  level: DEFAULT_LOG_LEVEL,
  format: format.combine(format.colorize(), format.simple()),
  transports: [new transports.Console()],
})

export const logger = consoleLogger

export default logger
