import type { Comment } from "@example-app/models/comment.js"

import { ApplicationPolicy } from "@example-app/policies/application-policy.js"

export class CommentPolicy extends ApplicationPolicy<Comment> {
  override update(): boolean {
    return this.user.id === this.record.authorId
  }

  override destroy(): boolean {
    return this.user.id === this.record.authorId
  }

  override permittedAttributes(): string[] {
    return ["body"]
  }
}
