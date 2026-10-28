import { type Attributes } from "@sequelize/core"
import { BaseService } from "express-light-rail"

import { type Thread } from "@example-app/models/index.js"

export type ThreadUpdateAttributes = Partial<Attributes<Thread>>

export class UpdateService extends BaseService<Promise<Thread>> {
  constructor(
    private readonly thread: Thread,
    private readonly attributes: ThreadUpdateAttributes
  ) {
    super()
  }

  async perform(): Promise<Thread> {
    return this.thread.update(this.attributes)
  }
}
