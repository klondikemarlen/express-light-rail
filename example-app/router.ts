import { BaseApiError } from "express-light-rail"
import { Router, type NextFunction, type Request, type Response } from "express"

import { CreateTaskService } from "@example-app/create-task-service.js"
import { tasks, users, type User } from "@example-app/domain.js"
import { TasksPolicy } from "@example-app/tasks-policy.js"
import { TaskSerializer } from "@example-app/task-serializer.js"

type AuthenticatedResponse = Response<unknown, { currentUser: User }>

function currentUser(request: Request, response: Response, next: NextFunction): void {
  const identifier = request.get("x-user-id")
  if (!identifier || !Object.prototype.hasOwnProperty.call(users, identifier)) {
    next(new BaseApiError("unauthorized", "Authentication required", {}, 401))
    return
  }

  response.locals.currentUser = users[identifier]
  next()
}

export const router = Router()
router.use(currentUser)

router.get("/tasks", (request, response: AuthenticatedResponse) => {
  if (request.query.fail === "true") throw new Error("Internal demo failure")

  const policy = new TasksPolicy(response.locals.currentUser)
  const requestedStatus = request.query.status
  const filteredTasks = tasks.filter(
    (task) =>
      policy.canSee(task) && (requestedStatus === undefined || task.status === requestedStatus)
  )
  const serializedTasks = TaskSerializer.perform(filteredTasks)
  response.json({ tasks: serializedTasks })
})

router.post("/tasks", (request, response: AuthenticatedResponse) => {
  const user = response.locals.currentUser
  const policy = new TasksPolicy(user)
  if (!policy.canCreate()) {
    throw new BaseApiError("forbidden", "You cannot create tasks", {}, 403)
  }

  const attributes = policy.permitCreate(request.body)
  const task = CreateTaskService.perform(user, attributes)
  const serializedTask = TaskSerializer.perform(task)
  response.status(201).json({ task: serializedTask })
})
