import type { Path } from "express-light-rail"

import type { Comment } from "@example-app/models/index.js"

import { ApplicationPolicy } from "@example-app/policies/application-policy.js"

export class CommentsPolicy extends ApplicationPolicy<Comment> {
  override create(): boolean {
    return true
  }

  override update(): boolean {
    return this.user.id === this.record.authorId
  }

  override destroy(): boolean {
    return this.user.id === this.record.authorId
  }

  override permittedAttributes(): Path[] {
    return ["body"]
  }
}
