import { type CreationAttributes } from "@sequelize/core"
import { BaseApiError, BaseService } from "express-light-rail"

import { Comment, type Thread, type User } from "@example-app/models/index.js"

export type CommentCreationAttributes = Partial<CreationAttributes<Comment>>

export class CreateService extends BaseService<Promise<Comment>> {
  constructor(
    private readonly attributes: CommentCreationAttributes,
    private readonly thread: Thread,
    private readonly actor: User
  ) {
    super()
  }

  async perform(): Promise<Comment> {
    const { body } = this.attributes

    if (typeof body !== "string" || body.trim() === "") {
      throw new BaseApiError("invalid_input", "body is required", {}, 400)
    }

    return Comment.create({
      body,
      authorId: this.actor.id,
      threadId: this.thread.id,
    })
  }
}
