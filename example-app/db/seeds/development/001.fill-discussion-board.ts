import { db, Comment, Thread, User } from "@example-app/models/index.js"

export async function seed(): Promise<void> {
  await db.transaction(async () => {
    const [alice] = await User.findOrCreate({
      where: { username: "alice" },
      defaults: {
        username: "alice",
        name: "Alice",
        password: "alice-password",
      },
    })

    const [bob] = await User.findOrCreate({
      where: { username: "bob" },
      defaults: {
        username: "bob",
        name: "Bob",
        password: "bob-password",
      },
    })

    const [thread] = await Thread.findOrCreate({
      where: {
        authorId: alice.id,
        title: "Welcome to the board",
      },
      defaults: {
        authorId: alice.id,
        title: "Welcome to the board",
        body: "Share what you are building.",
      },
    })

    await Comment.findOrCreate({
      where: {
        authorId: bob.id,
        threadId: thread.id,
        body: "Glad to be here.",
      },
      defaults: {
        authorId: bob.id,
        threadId: thread.id,
        body: "Glad to be here.",
      },
    })
  })
}
