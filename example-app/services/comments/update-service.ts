import { type Attributes } from "@sequelize/core"
import { BaseService } from "express-light-rail"

import { type Comment } from "@example-app/models/index.js"

export type CommentUpdateAttributes = Partial<Attributes<Comment>>

export class UpdateService extends BaseService<Promise<Comment>> {
  constructor(
    private readonly comment: Comment,
    private readonly attributes: CommentUpdateAttributes
  ) {
    super()
  }

  async perform(): Promise<Comment> {
    return this.comment.update(this.attributes)
  }
}
