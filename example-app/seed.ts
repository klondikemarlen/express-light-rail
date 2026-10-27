import { sequelize } from "@example-app/database.js"
import { Comment, Thread, User } from "@example-app/models/index.js"

export async function seedDatabase(): Promise<void> {
  await sequelize.transaction(async (transaction) => {
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
