import { BaseService } from "express-light-rail"

import { db, Comment, type Thread } from "@example-app/models/index.js"

export class DestroyService extends BaseService<Promise<void>> {
  constructor(private readonly thread: Thread) {
    super()
  }

  async perform(): Promise<void> {
    await db.transaction(async () => {
      await Comment.destroy({ where: { threadId: this.thread.id } })
      await this.thread.destroy()
    })
  }
}
