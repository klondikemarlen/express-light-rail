import { BaseService } from "express-light-rail"

import { type Comment } from "@example-app/models/index.js"

export class DestroyCommentService extends BaseService<Promise<void>> {
  constructor(private readonly comment: Comment) {
    super()
  }

  async perform(): Promise<void> {
    await this.comment.destroy()
  }
}
