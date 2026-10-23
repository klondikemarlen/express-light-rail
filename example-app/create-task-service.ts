import { BaseService } from "express-light-rail"

import { tasks, type Task, type TaskAttributes, type User } from "@example-app/domain.js"

export class CreateTaskService extends BaseService<Task> {
  constructor(
    private readonly actor: User,
    private readonly attributes: TaskAttributes
  ) {
    super()
  }

  perform(): Task {
    const task: Task = {
      id: Math.max(0, ...tasks.map((record) => record.id)) + 1,
      ownerId: this.actor.id,
      ...this.attributes,
    }
    tasks.push(task)
    return task
  }
}
