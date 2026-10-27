import { BaseService } from "express-light-rail"

import { type Thread } from "@example-app/models/index.js"

export class UpdateThreadService extends BaseService<Promise<Thread>> {
  constructor(
    private readonly thread: Thread,
    private readonly attributes: Partial<Thread>
  ) {
    super()
  }

  async perform(): Promise<Thread> {
    this.thread.set(this.attributes)
    await this.thread.save()
    return this.thread
  }
}
