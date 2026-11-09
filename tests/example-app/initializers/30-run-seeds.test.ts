import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"

import { db, Comment, Thread, User } from "@example-app/models/index.js"

import { commentFactory } from "@tests/example-app/factories/comment-factory.js"
import { threadFactory } from "@tests/example-app/factories/thread-factory.js"
import { userFactory } from "@tests/example-app/factories/user-factory.js"
import { cleanExampleDatabase, prepareExampleDatabase } from "@tests/support/example-database.js"

import { runSeeds } from "@example-app/initializers/30-run-seeds.js"

beforeAll(prepareExampleDatabase)
beforeEach(cleanExampleDatabase)

afterAll(async () => {
  await db.close()
})

describe("environment-specific seeds", () => {
  test("when development is selected, creates an authored discussion with a comment", async () => {
    // Arrange
    const environment = "development"

    // Act
    await runSeeds(environment)

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
    await runSeeds("development")
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
    await runSeeds("development")
    const users = await User.findAll({ order: [["id", "ASC"]] })
    const threads = await Thread.findAll()
    const comments = await Comment.findAll()

    // Act
    await runSeeds("development")

    // Assert
    expect(await User.findAll({ order: [["id", "ASC"]] })).toEqual(users)
    expect(await Thread.findAll()).toEqual(threads)
    expect(await Comment.findAll()).toEqual(comments)
  })

  test("when only soft-deleted users remain, does not recreate demo accounts", async () => {
    // Arrange
    const author = await userFactory.create({ username: "alice" })
    await author.destroy()

    // Act
    await runSeeds("development")

    // Assert
    expect(await User.count()).toBe(0)
    expect(await User.count({ paranoid: false })).toBe(1)
    expect(await Thread.count({ paranoid: false })).toBe(0)
    expect(await Comment.count({ paranoid: false })).toBe(0)
  })

  test("when a discussion database already has users, preserves its edited content", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    await threadFactory.create({
      authorId: author.id,
      title: "Edited discussion",
      body: "Keep this content on restart.",
    })

    // Act
    await runSeeds("development")

    // Assert
    const threads = await Thread.findAll({
      attributes: ["title", "body"],
      raw: true,
    })
    expect(threads).toEqual([
      {
        title: "Edited discussion",
        body: "Keep this content on restart.",
      },
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
      await expect(runSeeds("development")).rejects.toThrow(seedFailure)

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
