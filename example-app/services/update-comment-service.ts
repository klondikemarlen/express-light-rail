import { BaseService } from "express-light-rail"

import { type Comment } from "@example-app/models/index.js"

export class UpdateCommentService extends BaseService<Promise<Comment>> {
  constructor(
    private readonly comment: Comment,
    private readonly attributes: Partial<Comment>
  ) {
    super()
  }

  async perform(): Promise<Comment> {
    this.comment.set(this.attributes)
    await this.comment.save()
    return this.comment
  }
}
