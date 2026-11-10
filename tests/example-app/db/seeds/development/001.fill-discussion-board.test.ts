import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"

import { db, Comment, Thread, User } from "@example-app/models/index.js"

import { commentFactory } from "@tests/example-app/factories/comment-factory.js"
import { threadFactory } from "@tests/example-app/factories/thread-factory.js"
import { userFactory } from "@tests/example-app/factories/user-factory.js"
import { cleanExampleDatabase, prepareExampleDatabase } from "@tests/support/example-database.js"

import { initialize as runSeeds } from "@example-app/initializers/30-run-seeds.js"
import { seed } from "@example-app/db/seeds/development/001.fill-discussion-board.js"

beforeAll(prepareExampleDatabase)
beforeEach(cleanExampleDatabase)

afterAll(async () => {
  await db.close()
})

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

  test("when factories create records after development seeds, uses unclaimed generated identifiers", async () => {
    // Arrange
    await seed()
    const seededUsers = await User.findAll()
    const seededThread = await Thread.findOne({ rejectOnEmpty: true })
    const seededComment = await Comment.findOne({ rejectOnEmpty: true })

    // Act
    const author = await userFactory.create()
    const thread = await threadFactory.create({ authorId: author.id })
    const comment = await commentFactory.create({ authorId: author.id, threadId: thread.id })

    // Assert
    expect(author.id).toBeGreaterThan(Math.max(...seededUsers.map((user) => user.id)))
    expect(thread.id).toBeGreaterThan(seededThread.id)
    expect(comment.id).toBeGreaterThan(seededComment.id)
    expect(thread.authorId).toBe(author.id)
    expect(comment.authorId).toBe(author.id)
    expect(comment.threadId).toBe(thread.id)
    for (const record of [...seededUsers, seededThread, seededComment, author, thread, comment]) {
      expect(record.createdAt).toBeInstanceOf(Date)
      expect(record.updatedAt).toBeInstanceOf(Date)
      expect(record.deletedAt).toBeNull()
    }
  })

  test("when development seeds run again, preserves the original records", async () => {
    // Arrange
    await seed()
    const users = await User.findAll({ order: [["id", "ASC"]] })
    const threads = await Thread.findAll()
    const comments = await Comment.findAll()

    // Act
    await seed()

    // Assert
    expect(await User.findAll({ order: [["id", "ASC"]] })).toEqual(users)
    expect(await Thread.findAll()).toEqual(threads)
    expect(await Comment.findAll()).toEqual(comments)
  })

  test("when some demo records exist, creates missing records without changing existing ones", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
      name: "Alice Updated",
      password: "changed-password",
    })
    const thread = await threadFactory.create({
      authorId: author.id,
      title: "Welcome to the board",
      body: "Keep this content on restart.",
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
    expect(await Thread.findAll()).toMatchObject([
      {
        id: thread.id,
        authorId: author.id,
        title: "Welcome to the board",
        body: "Keep this content on restart.",
        updatedAt: thread.updatedAt,
      },
    ])
    const bob = await User.findOne({ where: { username: "bob" }, rejectOnEmpty: true })
    expect(await Comment.findAll()).toMatchObject([
      { authorId: bob.id, threadId: thread.id, body: "Glad to be here." },
    ])
  })

  test("when the final development seed fails, rolls back earlier records", async () => {
    // Arrange
    const seedFailure = new Error("Could not create the seed comment")
    const removeFailureHook = Comment.hooks.addListener("beforeCreate", () => {
      throw seedFailure
    })

    try {
      // Act
      await expect(seed()).rejects.toThrow(seedFailure)

      // Assert
      const users = await User.findAll({ paranoid: false })
      expect(users).toEqual([])

      const threads = await Thread.findAll({ paranoid: false })
      expect(threads).toEqual([])

      const comments = await Comment.findAll({ paranoid: false })
      expect(comments).toEqual([])
    } finally {
      removeFailureHook()
    }
  })

  test("when production is selected, does not create demo accounts", async () => {
    // Arrange
    const environment = "production"

    // Act
    await runSeeds(environment)

    // Assert
    const users = await User.findAll({ paranoid: false })
    expect(users).toEqual([])
  })

  test("when test is selected, leaves scenario data to test factories", async () => {
    // Arrange
    const environment = "test"

    // Act
    await runSeeds(environment)

    // Assert
    const users = await User.findAll({ paranoid: false })
    expect(users).toEqual([])
  })
})
