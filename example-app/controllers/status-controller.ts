import { BaseController } from "express-light-rail"

import { ShowService } from "@example-app/services/status/index.js"

export class StatusController extends BaseController {
  async show() {
    const healthStatus = await ShowService.perform()

    let httpStatus = 200
    if (healthStatus.status === "unavailable") {
      httpStatus = 503
    }

    return this.response
      .contentType("application/health+json")
      .status(httpStatus)
      .json(healthStatus)
  }
}
