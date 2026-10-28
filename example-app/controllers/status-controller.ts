import { BaseController } from "express-light-rail"

import { sequelize } from "@example-app/database.js"

export class StatusController extends BaseController {
  async index(): Promise<void> {
    try {
      await sequelize.authenticate()
      this.response.status(200).json({ status: "ok" })
    } catch {
      this.response.status(503).json({ status: "unavailable" })
    }
  }
}
