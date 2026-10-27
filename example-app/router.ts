import { BaseApiError, BaseController } from "express-light-rail"
import { Router, type NextFunction, type Request, type Response } from "express"

import { CreateTaskService } from "@example-app/create-task-service.js"
import { tasks, users, type User } from "@example-app/domain.js"
import { TasksPolicy } from "@example-app/tasks-policy.js"
import { TaskSerializer } from "@example-app/task-serializer.js"

type AuthenticatedRequest = Request & { currentUser: User }

abstract class ApplicationController extends BaseController<never, AuthenticatedRequest> {
  protected get currentUser(): User {
    return this.request.currentUser
  }
}

class TasksController extends ApplicationController {
  async index(): Promise<void> {
    if (this.request.query.fail === "true") throw new Error("Internal demo failure")

    const policy = new TasksPolicy(this.currentUser)
    const requestedStatus = this.request.query.status
    const filteredTasks = tasks.filter(
      (task) =>
        policy.canSee(task) && (requestedStatus === undefined || task.status === requestedStatus)
    )
    const serializedTasks = TaskSerializer.perform(filteredTasks)
    this.response.json({ tasks: serializedTasks })
  }

  async create(): Promise<void> {
    const user = this.currentUser
    const policy = new TasksPolicy(user)
    if (!policy.canCreate()) {
      throw new BaseApiError("forbidden", "You cannot create tasks", {}, 403)
    }

    const attributes = policy.permitCreate(this.request.body)
    const task = CreateTaskService.perform(user, attributes)
    const serializedTask = TaskSerializer.perform(task)
    this.response.status(201).json({ task: serializedTask })
  }
}

function currentUser(request: Request, _response: Response, next: NextFunction): void {
  const identifier = request.get("x-user-id")
  if (!identifier || !Object.prototype.hasOwnProperty.call(users, identifier)) {
    next(new BaseApiError("unauthorized", "Authentication required", {}, 401))
    return
  }

  Object.assign(request, { currentUser: users[identifier] })
  next()
}

export const router = Router()
router.use(currentUser)
router.get("/tasks", TasksController.index)
router.post("/tasks", TasksController.create)
