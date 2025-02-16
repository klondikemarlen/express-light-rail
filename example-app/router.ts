import { Router } from "express"

import { UsersController } from "@example-app/controllers/index.js"

export const router = Router()

router.route("/api/position-actions").get(UsersController.index).post(UsersController.create)
router
  .route("/api/position-actions/:id")
  .get(UsersController.show)
  .patch(UsersController.update)
  .delete(UsersController.destroy)
