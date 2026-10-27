import { BaseApiError, BaseService } from "express-light-rail"

import { Thread, type User } from "@example-app/models/index.js"

export class CreateThreadService extends BaseService<Promise<Thread>> {
  constructor(
    private readonly actor: User,
    private readonly attributes: Partial<Thread>
  ) {
    super()
  }

  async perform(): Promise<Thread> {
    const { title, body } = this.attributes
    if (typeof title !== "string" || title.trim() === "") {
      throw new BaseApiError("invalid_input", "title is required", {}, 400)
    }
    if (typeof body !== "string" || body.trim() === "") {
      throw new BaseApiError("invalid_input", "body is required", {}, 400)
    }

    return Thread.create({
      title,
      body,
      authorId: this.actor.id,
    })
  }
}
