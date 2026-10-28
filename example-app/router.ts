import { Router } from "express"

import {
  CommentsController,
  StatusController,
  ThreadsController,
  UsersController,
} from "@example-app/controllers/index.js"
import {
  authorizationMiddleware,
  bodyAuthorizationHoistMiddleware,
} from "@example-app/middlewares/index.js"

export const router = Router()

router.route("/_status").get(StatusController.show)

router.use("/api", bodyAuthorizationHoistMiddleware, authorizationMiddleware)

router.route("/api/users").get(UsersController.index)
router.route("/api/users/:userId").get(UsersController.show)

router.route("/api/threads").get(ThreadsController.index).post(ThreadsController.create)

router
  .route("/api/threads/:threadId")
  .get(ThreadsController.show)
  .patch(ThreadsController.update)
  .delete(ThreadsController.destroy)

router
  .route("/api/threads/:threadId/comments")
  .get(CommentsController.index)
  .post(CommentsController.create)

router
  .route("/api/threads/:threadId/comments/:commentId")
  .get(CommentsController.show)
  .patch(CommentsController.update)
  .delete(CommentsController.destroy)
