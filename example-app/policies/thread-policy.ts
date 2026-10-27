import type { Thread } from "@example-app/models/thread.js"

import { ApplicationPolicy } from "@example-app/policies/application-policy.js"

export class ThreadPolicy extends ApplicationPolicy<Thread> {
  override update(): boolean {
    return this.user.id === this.record.authorId
  }

  override destroy(): boolean {
    return this.user.id === this.record.authorId
  }

  override permittedAttributes(): string[] {
    return ["title", "body"]
  }
}
