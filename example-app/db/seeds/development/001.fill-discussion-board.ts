import { isNil } from "lodash"

import { db, Comment, Thread, User } from "@example-app/models/index.js"

export async function seed(): Promise<void> {
  await db.transaction(async () => {
    let alice = await User.findOne({
      where: { username: "alice" },
    })
    if (isNil(alice)) {
      alice = await User.create({
        username: "alice",
        name: "Alice",
        password: "alice-password",
      })
    }

    let bob = await User.findOne({
      where: { username: "bob" },
    })
    if (isNil(bob)) {
      bob = await User.create({
        username: "bob",
        name: "Bob",
        password: "bob-password",
      })
    }

    let thread = await Thread.findOne({
      where: {
        authorId: alice.id,
        title: "Welcome to the board",
      },
    })
    if (isNil(thread)) {
      thread = await Thread.create({
        authorId: alice.id,
        title: "Welcome to the board",
        body: "Share what you are building.",
      })
    }

    const comment = await Comment.findOne({
      where: {
        authorId: bob.id,
        threadId: thread.id,
        body: "Glad to be here.",
      },
    })
    if (isNil(comment)) {
      await Comment.create({
        authorId: bob.id,
        threadId: thread.id,
        body: "Glad to be here.",
      })
    }
  })
}
