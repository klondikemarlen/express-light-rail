import { FactoryShark, type FactoryInterface } from "factory-shark"

import { Thread } from "@example-app/models/index.js"

import { userFactory } from "@tests/example-app/factories/user-factory.js"

export const threadFactory: FactoryInterface<Thread> = FactoryShark.define<Thread>(
  Thread,
  ({ sequence, associate }) => {
    associate("author", userFactory)

    return {
      title: `Discussion ${sequence}`,
      body: "Share what you are building.",
    }
  }
)
