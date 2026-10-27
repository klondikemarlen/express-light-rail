import request from "supertest"
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest"

const { originalStorage } = vi.hoisted(() => {
  const originalStorage = process.env.EXAMPLE_DATABASE_STORAGE
  process.env.EXAMPLE_DATABASE_STORAGE = ":memory:"
  return { originalStorage }
})

import { sequelize } from "@example-app/database.js"
import { Comment, Thread } from "@example-app/models/index.js"
import { seedDatabase } from "@example-app/seed.js"

import { app } from "@example-app/app.js"

beforeEach(async () => {
  await sequelize.sync({ force: true })
  await seedDatabase()
})

afterAll(async () => {
  await sequelize.close()
  if (originalStorage === undefined) {
    delete process.env.EXAMPLE_DATABASE_STORAGE
  } else {
    process.env.EXAMPLE_DATABASE_STORAGE = originalStorage
  }
})

describe("discussion board", () => {
  test("when a user lists threads, returns serialized model records", async () => {
    // Arrange
    const route = request(app).get("/api/threads").set("x-user-id", "bob")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      threads: [
        {
          id: 1,
          title: "Welcome to the board",
          body: "Share what you are building.",
          authorId: 1,
        },
      ],
    })
  })

  test("when a user creates a thread, client fields cannot replace its identity or author", async () => {
    // Arrange
    const route = request(app).post("/api/threads").set("x-user-id", "bob").send({
      id: 99,
      authorId: 1,
      title: "A new discussion",
      body: "What are you building?",
    })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      thread: {
        id: 2,
        authorId: 2,
        title: "A new discussion",
        body: "What are you building?",
      },
    })
  })

  test("when an author updates a thread title, preserves omitted body and ownership", async () => {
    // Arrange
    const route = request(app).patch("/api/threads/1").set("x-user-id", "alice").send({
      title: "An updated welcome",
      authorId: 2,
    })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      thread: {
        id: 1,
        title: "An updated welcome",
        body: "Share what you are building.",
        authorId: 1,
      },
    })
  })

  test("when another user edits a thread, denies the mutation", async () => {
    // Arrange
    const route = request(app).patch("/api/threads/1").set("x-user-id", "bob").send({
      title: "Not my discussion",
    })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe("forbidden")
  })

  test("when required thread text is blank, rejects the input", async () => {
    // Arrange
    const route = request(app).post("/api/threads").set("x-user-id", "alice").send({
      title: "   ",
      body: "A valid body",
    })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe("invalid_input")
  })

  test("when a thread does not exist, returns a public not-found error", async () => {
    // Arrange
    const route = request(app).get("/api/threads/999").set("x-user-id", "alice")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe("not_found")
  })

  test("when a user creates a comment, assigns the current user and URL parent", async () => {
    // Arrange
    const route = request(app).post("/api/threads/1/comments").set("x-user-id", "alice").send({
      body: "I am building a discussion board.",
      id: 99,
      authorId: 2,
      threadId: 999,
    })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      comment: {
        id: 2,
        body: "I am building a discussion board.",
        authorId: 1,
        threadId: 1,
      },
    })
  })

  test("when the thread author edits somebody else's comment, denies the mutation", async () => {
    // Arrange
    const route = request(app).patch("/api/threads/1/comments/1").set("x-user-id", "alice").send({
      body: "Not my comment",
    })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe("forbidden")
  })

  test("when a comment is requested under another existing thread, returns not found", async () => {
    // Arrange
    const thread = await Thread.create({
      authorId: 2,
      title: "Another discussion",
      body: "Separate comments",
    })
    const route = request(app).get(`/api/threads/${thread.id}/comments/1`).set("x-user-id", "bob")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe("not_found")
  })

  test("when an author deletes a thread, removes its comments through the model relationship", async () => {
    // Arrange
    const route = request(app).delete("/api/threads/1").set("x-user-id", "alice")

    // Act
    await route.expect(204)

    // Assert
    const comments = await Comment.findAll({ where: { threadId: 1 } })
    expect(comments).toEqual([])
  })

  test("when demo identity is missing, denies access", async () => {
    // Arrange
    const route = request(app).get("/api/threads")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe("unauthorized")
  })

  test("when JSON cannot be parsed, preserves the client error status", async () => {
    // Arrange
    const route = request(app)
      .post("/api/threads")
      .set("Content-Type", "application/json")
      .send("{")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: "invalid_request",
        msg: "Invalid request",
        meta: {},
      },
    })
  })

  test("when a JSON body exceeds its limit, preserves payload-too-large status", async () => {
    // Arrange
    const route = request(app)
      .post("/api/threads")
      .send({ title: "x".repeat(110000) })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(413)
    expect(response.body.error.code).toBe("invalid_request")
  })
})
