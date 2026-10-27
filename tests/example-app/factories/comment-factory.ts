import { FactoryShark, type FactoryInterface } from "factory-shark"

import { Comment } from "@example-app/models/index.js"

import { threadFactory } from "@tests/example-app/factories/thread-factory.js"
import { userFactory } from "@tests/example-app/factories/user-factory.js"

export const commentFactory: FactoryInterface<Comment> = FactoryShark.define<Comment>(
  Comment,
  ({ associate }) => {
    associate("author", userFactory)
    associate("thread", threadFactory)

    return {
      body: "A contribution to the discussion.",
    }
  }
)
