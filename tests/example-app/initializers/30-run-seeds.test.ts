import { afterAll, beforeEach, describe, expect, test, vi } from "vitest"

const { originalStorage } = vi.hoisted(() => {
  const originalStorage = process.env.EXAMPLE_DATABASE_STORAGE
  process.env.EXAMPLE_DATABASE_STORAGE = ":memory:"
  return {
    originalStorage,
  }
})

import { db, Thread, User } from "@example-app/models/index.js"

import { threadFactory } from "@tests/example-app/factories/thread-factory.js"
import { userFactory } from "@tests/example-app/factories/user-factory.js"

import { runSeeds } from "@example-app/initializers/30-run-seeds.js"

beforeEach(async () => {
  await db.sync({ force: true })
})

afterAll(async () => {
  await db.close()
  if (originalStorage === undefined) {
    delete process.env.EXAMPLE_DATABASE_STORAGE
  } else {
    process.env.EXAMPLE_DATABASE_STORAGE = originalStorage
  }
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

  test("when production is selected, does not create demo accounts", async () => {
    // Arrange
    const environment = "production"

    // Act
    await runSeeds(environment)

    // Assert
    const users = await User.findAll()
    expect(users).toEqual([])
  })

  test("when test is selected, leaves scenario data to test factories", async () => {
    // Arrange
    const environment = "test"

    // Act
    await runSeeds(environment)

    // Assert
    const users = await User.findAll()
    expect(users).toEqual([])
  })
})
