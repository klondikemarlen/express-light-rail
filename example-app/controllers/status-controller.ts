import { BaseController } from "express-light-rail"

import { db } from "@example-app/models/index.js"

export class StatusController extends BaseController {
  async index(): Promise<void> {
    try {
      await db.authenticate()
      this.response.status(200).json({ status: "ok" })
    } catch {
      this.response.status(503).json({ status: "unavailable" })
    }
  }
}
