import { db, Comment, Thread, User } from "@example-app/models/index.js"
import { hashPassword } from "@example-app/utils/password.js"

export async function seed(): Promise<void> {
  await db.transaction(async (transaction) => {
    const userCount = await User.count({
      transaction,
    })
    if (userCount > 0) {
      return
    }

    await User.create(
      {
        id: 1,
        username: "alice",
        name: "Alice",
        passwordHash: await hashPassword("alice-password"),
      },
      {
        transaction,
      }
    )

    await User.create(
      {
        id: 2,
        username: "bob",
        name: "Bob",
        passwordHash: await hashPassword("bob-password"),
      },
      {
        transaction,
      }
    )

    await Thread.create(
      {
        id: 1,
        title: "Welcome to the board",
        body: "Share what you are building.",
        authorId: 1,
      },
      {
        transaction,
      }
    )

    await Comment.create(
      {
        id: 1,
        body: "Glad to be here.",
        authorId: 2,
        threadId: 1,
      },
      {
        transaction,
      }
    )
  })
}
