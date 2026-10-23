import { BaseApiError } from "express-light-rail"

import type { Task, User } from "@example-app/domain.js"

export class TasksPolicy {
  constructor(private readonly user: User) {}

  canCreate(): boolean {
    return this.user.canManageTasks
  }

  canSee(record: Task): boolean {
    return record.visibility === "public" || record.ownerId === this.user.id
  }

  permitCreate(input: unknown): Pick<Task, "title" | "status" | "visibility"> {
    if (!input || typeof input !== "object") {
      throw new BaseApiError("invalid_input", "Expected a task object", {}, 400)
    }

    const body = input as Record<string, unknown>
    if (typeof body.title !== "string" || body.title.trim() === "") {
      throw new BaseApiError("invalid_input", "title is required", {}, 400)
    }

    const status = body.status === "done" ? "done" : "open"
    const visibility = body.visibility === "public" ? "public" : "private"
    return { title: body.title.trim(), status, visibility }
  }
}
