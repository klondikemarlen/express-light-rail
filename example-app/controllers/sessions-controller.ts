import { BaseController } from "express-light-rail"

import { CreateService } from "@example-app/services/sessions/index.js"

export class SessionsController extends BaseController {
  async create() {
    this.response.set("Cache-Control", "no-store")
    const { username, password } = this.request.body ?? {}
    const session = await CreateService.perform({
      username,
      password,
    })
    return this.response.status(201).json(session)
  }
}
