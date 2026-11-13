import { BaseService } from "express-light-rail"

import { db } from "@example-app/models/index.js"

export type StatusAsShow = {
  status: "ok" | "unavailable"
}

export class ShowService extends BaseService<Promise<StatusAsShow>> {
  async perform(): Promise<StatusAsShow> {
    try {
      await db.authenticate()
      return {
        status: "ok",
      }
    } catch {
      return {
        status: "unavailable",
      }
    }
  }
}
