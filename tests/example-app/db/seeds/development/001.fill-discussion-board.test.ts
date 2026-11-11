import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"

import { Comment, Thread, User } from "@example-app/models/index.js"

import { commentFactory } from "@tests/example-app/factories/comment-factory.js"
import { threadFactory } from "@tests/example-app/factories/thread-factory.js"
import { userFactory } from "@tests/example-app/factories/user-factory.js"
import {
  cleanExampleDatabase,
  closeExampleDatabase,
  prepareExampleDatabase,
} from "@tests/support/example-database.js"

import { initialize as runSeeds } from "@example-app/initializers/30-run-seeds.js"
import { seed } from "@example-app/db/seeds/development/001.fill-discussion-board.js"

beforeAll(prepareExampleDatabase)
beforeEach(cleanExampleDatabase)

afterAll(closeExampleDatabase)

describe("discussion-board seeds", () => {
  test("when the database is empty, creates an authored discussion with a comment", async () => {
    // Arrange: beforeEach clears the database.

    // Act
    await seed()

    // Assert
    const thread = await Thread.findOne({
      attributes: ["title"],
      include: [
        {
          association: "author",
          attributes: ["username"],
        },
        {
          association: "comments",
          attributes: ["body"],
          include: [
            {
              association: "author",
              attributes: ["username"],
            },
          ],
        },
      ],
    })
    expect(thread?.toJSON()).toEqual({
      title: "Welcome to the board",
      author: {
        username: "alice",
      },
      comments: [
        {
          body: "Glad to be here.",
          author: {
            username: "bob",
          },
        },
      ],
    })
  })

  test("when a user is created after development seeds, uses an unclaimed identifier", async () => {
    // Arrange
    await seed()
    const seededUsers = await User.findAll()

    // Act
    const author = await userFactory.create()

    // Assert
    expect(author.id).toBeGreaterThan(Math.max(...seededUsers.map((user) => user.id)))
  })

  test("when a thread is created after development seeds, uses an unclaimed identifier", async () => {
    // Arrange
    await seed()
    const seededThread = await Thread.findOne({ rejectOnEmpty: true })

    // Act
    const thread = await threadFactory.create()

    // Assert
    expect(thread.id).toBeGreaterThan(seededThread.id)
  })

  test("when a comment is created after development seeds, uses an unclaimed identifier", async () => {
    // Arrange
    await seed()
    const seededComment = await Comment.findOne({ rejectOnEmpty: true })

    // Act
    const comment = await commentFactory.create()

    // Assert
    expect(comment.id).toBeGreaterThan(seededComment.id)
  })

  test("when development seeds run again, preserves the original users", async () => {
    // Arrange
    await seed()
    const originalUsers = await User.findAll({ order: [["id", "ASC"]] })

    // Act
    await seed()

    // Assert
    const users = await User.findAll({ order: [["id", "ASC"]] })
    expect(users).toEqual(originalUsers)
  })

  test("when development seeds run again, preserves the original thread", async () => {
    // Arrange
    await seed()
    const originalThreads = await Thread.findAll()

    // Act
    await seed()

    // Assert
    const threads = await Thread.findAll()
    expect(threads).toEqual(originalThreads)
  })

  test("when development seeds run again, preserves the original comment", async () => {
    // Arrange
    await seed()
    const originalComments = await Comment.findAll()

    // Act
    await seed()

    // Assert
    const comments = await Comment.findAll()
    expect(comments).toEqual(originalComments)
  })

  test("when Alice already exists, preserves her edits and creates Bob", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
      name: "Alice Updated",
      password: "changed-password",
    })

    // Act
    await seed()

    // Assert
    const users = await User.findAll({ order: [["id", "ASC"]] })
    expect(users).toMatchObject([
      {
        id: author.id,
        username: "alice",
        name: "Alice Updated",
        passwordHash: author.passwordHash,
      },
      { username: "bob", name: "Bob" },
    ])
  })

  test("when the welcome thread already exists, preserves its edited content", async () => {
    // Arrange
    const author = await userFactory.create({ username: "alice" })
    const thread = await threadFactory.create({
      authorId: author.id,
      title: "Welcome to the board",
      body: "Keep this content on restart.",
    })

    // Act
    await seed()

    // Assert
    const threads = await Thread.findAll()
    expect(threads).toMatchObject([
      {
        id: thread.id,
        authorId: author.id,
        title: "Welcome to the board",
        body: "Keep this content on restart.",
        updatedAt: thread.updatedAt,
      },
    ])
  })

  test("when the welcome thread has no comment, creates Bob's missing comment", async () => {
    // Arrange
    const author = await userFactory.create({ username: "alice" })
    const thread = await threadFactory.create({
      authorId: author.id,
      title: "Welcome to the board",
      body: "Keep this content on restart.",
    })

    // Act
    await seed()

    // Assert
    const bob = await User.findOne({ where: { username: "bob" }, rejectOnEmpty: true })
    const comments = await Comment.findAll()
    expect(comments).toMatchObject([
      { authorId: bob.id, threadId: thread.id, body: "Glad to be here." },
    ])
  })

  test("when the final development seed fails, reports the failure", async () => {
    // Arrange
    const seedFailure = new Error("Could not create the seed comment")
    const removeFailureHook = Comment.hooks.addListener("beforeCreate", () => {
      throw seedFailure
    })

    try {
      // Act / Assert
      await expect(seed()).rejects.toThrow(seedFailure)
    } finally {
      removeFailureHook()
    }
  })

  test("when the final development seed fails, rolls back the users", async () => {
    // Arrange
    const seedFailure = new Error("Could not create the seed comment")
    const removeFailureHook = Comment.hooks.addListener("beforeCreate", () => {
      throw seedFailure
    })

    try {
      // Act
      try {
        await seed()
      } catch (error) {
        if (error !== seedFailure) throw error
      }

      // Assert
      const users = await User.findAll({ paranoid: false })
      expect(users).toEqual([])
    } finally {
      removeFailureHook()
    }
  })

  test("when the final development seed fails, rolls back the thread", async () => {
    // Arrange
    const seedFailure = new Error("Could not create the seed comment")
    const removeFailureHook = Comment.hooks.addListener("beforeCreate", () => {
      throw seedFailure
    })

    try {
      // Act
      try {
        await seed()
      } catch (error) {
        if (error !== seedFailure) throw error
      }

      // Assert
      const threads = await Thread.findAll({ paranoid: false })
      expect(threads).toEqual([])
    } finally {
      removeFailureHook()
    }
  })

  test("when test is selected, leaves scenario data to test factories", async () => {
    // Arrange: the test wrapper selects NODE_ENV=test.

    // Act
    await runSeeds()

    // Assert
    const users = await User.findAll({ paranoid: false })
    expect(users).toEqual([])
  })
})
