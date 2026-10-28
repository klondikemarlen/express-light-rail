import { Router } from "express"

import { CommentsController } from "@example-app/controllers/comments-controller.js"
import { ThreadsController } from "@example-app/controllers/threads-controller.js"
import { UsersController } from "@example-app/controllers/users-controller.js"

export const router = Router()

router.route("/users").get(UsersController.index)
router.route("/users/:userId").get(UsersController.show)

router.route("/threads").get(ThreadsController.index).post(ThreadsController.create)

router
  .route("/threads/:threadId")
  .get(ThreadsController.show)
  .patch(ThreadsController.update)
  .delete(ThreadsController.destroy)

router
  .route("/threads/:threadId/comments")
  .get(CommentsController.index)
  .post(CommentsController.create)

router
  .route("/threads/:threadId/comments/:commentId")
  .get(CommentsController.show)
  .patch(CommentsController.update)
  .delete(CommentsController.destroy)
