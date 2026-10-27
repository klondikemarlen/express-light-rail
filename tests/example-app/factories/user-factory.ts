import { FactoryShark, type FactoryInterface } from "factory-shark"

import { User } from "@example-app/models/index.js"

export const userFactory: FactoryInterface<User> = FactoryShark.define<User>(
  User,
  ({ sequence }) => ({
    username: `user-${sequence}`,
    name: `User ${sequence}`,
  })
)
