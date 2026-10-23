import express from "express"
import { createApiErrorHandler, createApiNotFoundHandler } from "express-light-rail"

import { router } from "@example-app/router.js"

export const app = express()
app.use(express.json())
app.use("/api", router)
app.use("/api", createApiNotFoundHandler())
app.use("/api", createApiErrorHandler())
