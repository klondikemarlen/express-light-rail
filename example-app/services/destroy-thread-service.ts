import { BaseService } from "express-light-rail"

import { type Thread } from "@example-app/models/index.js"

export class DestroyThreadService extends BaseService<Promise<void>> {
  constructor(private readonly thread: Thread) {
    super()
  }

  async perform(): Promise<void> {
    await this.thread.destroy()
  }
}
