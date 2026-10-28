import request from "supertest"
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest"

const { originalStorage } = vi.hoisted(() => {
  const originalStorage = process.env.EXAMPLE_DATABASE_STORAGE
  process.env.EXAMPLE_DATABASE_STORAGE = ":memory:"
  return { originalStorage }
})

import { db, Comment } from "@example-app/models/index.js"

import { commentFactory } from "@tests/example-app/factories/comment-factory.js"
import { threadFactory } from "@tests/example-app/factories/thread-factory.js"
import { userFactory } from "@tests/example-app/factories/user-factory.js"

import { app } from "@example-app/app.js"

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

describe("discussion board", () => {
  test("when a user lists threads, returns serialized model records", async () => {
    // Arrange
    const reader = await userFactory.create({
      username: "bob",
    })
    const thread = await threadFactory.create({
      title: "Welcome to the board",
      body: "Share what you are building.",
    })
    const route = request(app).get("/api/threads").set("x-user-id", reader.username)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      threads: [
        {
          id: thread.id,
          title: "Welcome to the board",
          body: "Share what you are building.",
          authorId: thread.authorId,
        },
      ],
    })
  })

  test("when a user creates a thread, client fields cannot replace its identity or author", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "bob",
    })
    const existingThread = await threadFactory.create()
    const route = request(app).post("/api/threads").set("x-user-id", author.username).send({
      id: 99,
      authorId: existingThread.authorId,
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
        authorId: author.id,
        title: "A new discussion",
        body: "What are you building?",
      },
    })
  })

  test("when an author updates a thread title, preserves omitted body and ownership", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const thread = await threadFactory.create({
      authorId: author.id,
      body: "Share what you are building.",
    })
    const route = request(app)
      .patch(`/api/threads/${thread.id}`)
      .set("x-user-id", author.username)
      .send({
        title: "An updated welcome",
        authorId: 999,
      })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      thread: {
        id: thread.id,
        title: "An updated welcome",
        body: "Share what you are building.",
        authorId: author.id,
      },
    })
  })

  test("when another user edits a thread, denies the mutation", async () => {
    // Arrange
    const otherUser = await userFactory.create({
      username: "bob",
    })
    const thread = await threadFactory.create()
    const route = request(app)
      .patch(`/api/threads/${thread.id}`)
      .set("x-user-id", otherUser.username)
      .send({
        title: "Not my discussion",
      })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: {
        code: "forbidden",
        msg: "Forbidden",
        meta: {},
      },
    })
  })

  test("when required thread text is blank, rejects the input", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const route = request(app).post("/api/threads").set("x-user-id", author.username).send({
      title: "   ",
      body: "A valid body",
    })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: "invalid_input",
        msg: "title is required",
        meta: {},
      },
    })
  })

  test("when a thread does not exist, returns a public not-found error", async () => {
    // Arrange
    const reader = await userFactory.create({
      username: "alice",
    })
    const route = request(app).get("/api/threads/999").set("x-user-id", reader.username)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: {
        code: "not_found",
        msg: "Thread not found",
        meta: {},
      },
    })
  })

  test("when a user creates a comment, assigns the current user and URL parent", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const thread = await threadFactory.create()
    const route = request(app)
      .post(`/api/threads/${thread.id}/comments`)
      .set("x-user-id", author.username)
      .send({
        body: "I am building a discussion board.",
        id: 99,
        authorId: thread.authorId,
        threadId: 999,
      })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      comment: {
        id: 1,
        body: "I am building a discussion board.",
        authorId: author.id,
        threadId: thread.id,
      },
    })
  })

  test("when the thread author edits somebody else's comment, denies the mutation", async () => {
    // Arrange
    const threadAuthor = await userFactory.create({
      username: "alice",
    })
    const thread = await threadFactory.create({
      authorId: threadAuthor.id,
    })
    const comment = await commentFactory.create({
      threadId: thread.id,
    })
    const route = request(app)
      .patch(`/api/threads/${thread.id}/comments/${comment.id}`)
      .set("x-user-id", threadAuthor.username)
      .send({
        body: "Not my comment",
      })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: {
        code: "forbidden",
        msg: "Forbidden",
        meta: {},
      },
    })
  })

  test("when a comment is requested under another existing thread, returns not found", async () => {
    // Arrange
    const reader = await userFactory.create({
      username: "bob",
    })
    const comment = await commentFactory.create()
    const otherThread = await threadFactory.create()
    const route = request(app)
      .get(`/api/threads/${otherThread.id}/comments/${comment.id}`)
      .set("x-user-id", reader.username)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: {
        code: "not_found",
        msg: "Comment not found",
        meta: {},
      },
    })
  })

  test("when an author deletes a thread, returns an empty successful response", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const thread = await threadFactory.create({
      authorId: author.id,
    })
    const route = request(app).delete(`/api/threads/${thread.id}`).set("x-user-id", author.username)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(204)
    expect(response.text).toBe("")
  })

  test("when an author deletes a thread, removes its comments through the model relationship", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const thread = await threadFactory.create({
      authorId: author.id,
    })
    await commentFactory.create({
      threadId: thread.id,
    })
    const route = request(app).delete(`/api/threads/${thread.id}`).set("x-user-id", author.username)

    // Act
    await route

    // Assert
    const comments = await Comment.findAll({
      where: {
        threadId: thread.id,
      },
    })
    expect(comments).toEqual([])
  })

  test("when demo identity is missing, denies access", async () => {
    // Arrange
    const route = request(app).get("/api/threads")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: "unauthorized",
        msg: "Authentication required",
        meta: {},
      },
    })
  })

  test("when a JSON array is submitted as thread attributes, rejects it as invalid input", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const route = request(app).post("/api/threads").set("x-user-id", author.username).send([null])

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: "invalid_input",
        msg: "Expected a JSON object",
        meta: {},
      },
    })
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
    expect(response.body).toEqual({
      error: {
        code: "invalid_request",
        msg: "Invalid request",
        meta: {},
      },
    })
  })

  test("when URL-encoded attributes are submitted, creates an authorized thread", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const route = request(app)
      .post("/api/threads")
      .set("x-user-id", author.username)
      .type("form")
      .send({
        title: "A form discussion",
        body: "URL-encoded content",
      })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      thread: {
        id: 1,
        authorId: author.id,
        title: "A form discussion",
        body: "URL-encoded content",
      },
    })
  })

  test("when multipart text fields are submitted, creates an authorized thread", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const route = request(app)
      .post("/api/threads")
      .set("x-user-id", author.username)
      .field("title", "A multipart discussion")
      .field("body", "Text fields without file uploads")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      thread: {
        id: 1,
        authorId: author.id,
        title: "A multipart discussion",
        body: "Text fields without file uploads",
      },
    })
  })

  test("when an unknown API path requests HTML, returns the JSON not-found response", async () => {
    // Arrange
    const route = request(app).get("/api/missing").set("Accept", "text/html")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: {
        code: "not_found",
        msg: "Not Found",
        meta: {},
      },
    })
  })
})
