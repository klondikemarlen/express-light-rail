import { db, Comment, Thread, User } from "@example-app/models/index.js"

export async function seed(): Promise<void> {
  await db.transaction(async () => {
    const userCount = await User.count({ paranoid: false })
    if (userCount > 0) {
      return
    }

    const alice = await User.create({
      username: "alice",
      name: "Alice",
      password: "alice-password",
    })

    const bob = await User.create({
      username: "bob",
      name: "Bob",
      password: "bob-password",
    })

    const thread = await Thread.create({
      title: "Welcome to the board",
      body: "Share what you are building.",
      authorId: alice.id,
    })

    await Comment.create({
      body: "Glad to be here.",
      authorId: bob.id,
      threadId: thread.id,
    })
  })
}
