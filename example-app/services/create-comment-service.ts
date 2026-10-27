import { BaseApiError, BaseService } from "express-light-rail"

import { Comment, type Thread, type User } from "@example-app/models/index.js"

export class CreateCommentService extends BaseService<Promise<Comment>> {
  constructor(
    private readonly actor: User,
    private readonly thread: Thread,
    private readonly attributes: Partial<Comment>
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
