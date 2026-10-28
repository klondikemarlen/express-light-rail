import { FactoryShark, type FactoryInterface } from "factory-shark"

import { User } from "@example-app/models/index.js"
import { hashPassword } from "@example-app/utils/password.js"

const testPasswordHash = hashPassword("test-password")

export const userFactory: FactoryInterface<User> = FactoryShark.define<User>(
  User,
  ({ sequence }) => ({
    username: `user-${sequence}`,
    name: `User ${sequence}`,
  })
).beforeCreate(async (user) => {
  if (user.passwordHash === undefined) {
    user.passwordHash = await testPasswordHash
  }
})
