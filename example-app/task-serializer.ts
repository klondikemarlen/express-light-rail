import { BaseSerializer } from "express-light-rail"

import type { Task } from "@example-app/domain.js"

export type TaskJson = Pick<Task, "id" | "title" | "status" | "visibility">

export class TaskSerializer extends BaseSerializer<Task, TaskJson> {
  perform(): TaskJson {
    const { id, title, status, visibility } = this.record
    return { id, title, status, visibility }
  }
}
