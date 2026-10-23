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
    if (!input || typeof input !== "object") throw new TypeError("Expected a task object")

    const body = input as Record<string, unknown>
    if (typeof body.title !== "string" || body.title.trim() === "") {
      throw new TypeError("title is required")
    }

    const status = body.status === "done" ? "done" : "open"
    const visibility = body.visibility === "public" ? "public" : "private"
    return { title: body.title.trim(), status, visibility }
  }
}
