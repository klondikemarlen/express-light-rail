import { BaseApiError } from "express-light-rail"
import { Router, type NextFunction, type Request, type Response } from "express"

import { CommentsController } from "@example-app/controllers/comments-controller.js"
import { ThreadsController } from "@example-app/controllers/threads-controller.js"
import { UsersController } from "@example-app/controllers/users-controller.js"
import { User } from "@example-app/models/index.js"

async function authenticateDemoUser(
  request: Request,
  _response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const username = request.get("x-user-id")
    if (!username) {
      next(new BaseApiError("unauthorized", "Authentication required", {}, 401))
      return
    }

    const user = await User.findOne({
      where: {
        username,
      },
    })
    if (!user) {
      next(new BaseApiError("unauthorized", "Authentication required", {}, 401))
      return
    }

    Object.assign(request, {
      currentUser: user,
    })
    next()
  } catch (error: unknown) {
    next(error)
  }
}

export const router = Router()

router.use(authenticateDemoUser)

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
