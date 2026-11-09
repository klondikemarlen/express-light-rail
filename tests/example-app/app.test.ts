import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"

import { Comment, db, Thread } from "@example-app/models/index.js"

import { commentFactory } from "@tests/example-app/factories/comment-factory.js"
import { threadFactory } from "@tests/example-app/factories/thread-factory.js"
import { userFactory } from "@tests/example-app/factories/user-factory.js"
import { cleanExampleDatabase, prepareExampleDatabase } from "@tests/support/example-database.js"

import { app } from "@example-app/app.js"

beforeAll(prepareExampleDatabase)
beforeEach(cleanExampleDatabase)

afterAll(async () => {
  await db.close()
})

const testPassword = "test-password"

async function login(username: string): Promise<string> {
  const response = await request(app).post("/api/session").send({
    username,
    password: testPassword,
  })
  const { accessToken } = response.body
  if (response.status !== 201 || typeof accessToken !== "string") {
    throw new Error("Login did not return an access token")
  }
  return accessToken
}

describe("discussion board", () => {
  test("when a user lists threads, returns serialized model records", async () => {
    // Arrange
    const reader = await userFactory.create({
      username: "bob",
    })
    const token = await login(reader.username)
    const thread = await threadFactory.create({
      title: "Welcome to the board",
      body: "Share what you are building.",
    })
    const route = request(app).get("/api/threads").set("Authorization", `Bearer ${token}`)

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
    const token = await login(author.username)
    const existingThread = await threadFactory.create()
    const route = request(app).post("/api/threads").set("Authorization", `Bearer ${token}`).send({
      id: existingThread.id,
      authorId: existingThread.authorId,
      title: "A new discussion",
      body: "What are you building?",
    })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    const createdThread = await Thread.findOne({
      where: { title: "A new discussion" },
      rejectOnEmpty: true,
    })
    expect(createdThread.id).not.toBe(existingThread.id)
    expect(response.body).toEqual({
      thread: {
        id: createdThread.id,
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
    const token = await login(author.username)
    const thread = await threadFactory.create({
      authorId: author.id,
      body: "Share what you are building.",
    })
    const route = request(app)
      .patch(`/api/threads/${thread.id}`)
      .set("Authorization", `Bearer ${token}`)
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
    const token = await login(otherUser.username)
    const thread = await threadFactory.create()
    const route = request(app)
      .patch(`/api/threads/${thread.id}`)
      .set("Authorization", `Bearer ${token}`)
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
    const token = await login(author.username)
    const route = request(app).post("/api/threads").set("Authorization", `Bearer ${token}`).send({
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
    const token = await login(reader.username)
    const route = request(app).get("/api/threads/999").set("Authorization", `Bearer ${token}`)

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

  test("when a thread identifier is malformed, returns a public not-found error", async () => {
    // Arrange
    const reader = await userFactory.create()
    const token = await login(reader.username)
    const route = request(app).get("/api/threads/not-an-id").set("Authorization", `Bearer ${token}`)

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

  test("when a user identifier is malformed, returns a public not-found error", async () => {
    // Arrange
    const reader = await userFactory.create()
    const token = await login(reader.username)
    const route = request(app).get("/api/users/not-an-id").set("Authorization", `Bearer ${token}`)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: {
        code: "not_found",
        msg: "User not found",
        meta: {},
      },
    })
  })

  test("when a nested comment identifier is malformed, returns a public not-found error", async () => {
    // Arrange
    const reader = await userFactory.create()
    const token = await login(reader.username)
    const thread = await threadFactory.create()
    const route = request(app)
      .get(`/api/threads/${thread.id}/comments/not-an-id`)
      .set("Authorization", `Bearer ${token}`)

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

  test("when a user creates a comment, assigns the current user and URL parent", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const token = await login(author.username)
    const thread = await threadFactory.create()
    const existingComment = await commentFactory.create({ threadId: thread.id })
    const route = request(app)
      .post(`/api/threads/${thread.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        body: "I am building a discussion board.",
        id: existingComment.id,
        authorId: thread.authorId,
        threadId: 999,
      })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    const createdComment = await Comment.findOne({
      where: { body: "I am building a discussion board." },
      rejectOnEmpty: true,
    })
    expect(createdComment.id).not.toBe(existingComment.id)
    expect(response.body).toEqual({
      comment: {
        id: createdComment.id,
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
    const token = await login(threadAuthor.username)
    const thread = await threadFactory.create({
      authorId: threadAuthor.id,
    })
    const comment = await commentFactory.create({
      threadId: thread.id,
    })
    const route = request(app)
      .patch(`/api/threads/${thread.id}/comments/${comment.id}`)
      .set("Authorization", `Bearer ${token}`)
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
    const token = await login(reader.username)
    const comment = await commentFactory.create()
    const otherThread = await threadFactory.create()
    const route = request(app)
      .get(`/api/threads/${otherThread.id}/comments/${comment.id}`)
      .set("Authorization", `Bearer ${token}`)

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
    const token = await login(author.username)
    const thread = await threadFactory.create({
      authorId: author.id,
    })
    const route = request(app)
      .delete(`/api/threads/${thread.id}`)
      .set("Authorization", `Bearer ${token}`)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(204)
    expect(response.text).toBe("")
  })

  test("when an author deletes a thread, hides the thread and its comments while retaining their rows", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const token = await login(author.username)
    const thread = await threadFactory.create({
      authorId: author.id,
    })
    const comment = await commentFactory.create({
      threadId: thread.id,
    })
    const otherComment = await commentFactory.create()
    const route = request(app)
      .delete(`/api/threads/${thread.id}`)
      .set("Authorization", `Bearer ${token}`)

    // Act
    const response = await route
    const deletedThreadResponse = await request(app)
      .get(`/api/threads/${thread.id}`)
      .set("Authorization", `Bearer ${token}`)
    const deletedCommentResponse = await request(app)
      .get(`/api/threads/${thread.id}/comments/${comment.id}`)
      .set("Authorization", `Bearer ${token}`)

    // Assert
    expect(response.status).toBe(204)
    expect(deletedThreadResponse.status).toBe(404)
    expect(deletedCommentResponse.status).toBe(404)
    expect(await Thread.findByPk(thread.id)).toBeNull()
    expect(await Comment.findByPk(comment.id)).toBeNull()
    const deletedThread = await Thread.findByPk(thread.id, { paranoid: false, rejectOnEmpty: true })
    const deletedComment = await Comment.findByPk(comment.id, {
      paranoid: false,
      rejectOnEmpty: true,
    })
    expect(deletedThread.deletedAt).toBeInstanceOf(Date)
    expect(deletedComment.deletedAt).toBeInstanceOf(Date)
    expect(await Comment.findByPk(otherComment.id)).toMatchObject({ deletedAt: null })
  })

  test("when a bearer token is missing, denies access", async () => {
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
    const token = await login(author.username)
    const route = request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${token}`)
      .send([null])

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
    const author = await userFactory.create({
      username: "alice",
    })
    const token = await login(author.username)
    const route = request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${token}`)
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
    const author = await userFactory.create({
      username: "alice",
    })
    const token = await login(author.username)
    const route = request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${token}`)
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
    const token = await login(author.username)
    const route = request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${token}`)
      .type("form")
      .send({
        title: "A form discussion",
        body: "URL-encoded content",
      })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    const createdThread = await Thread.findOne({
      where: { title: "A form discussion" },
      rejectOnEmpty: true,
    })
    expect(response.body).toEqual({
      thread: {
        id: createdThread.id,
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
    const token = await login(author.username)
    const route = request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "A multipart discussion")
      .field("body", "Text fields without file uploads")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    const createdThread = await Thread.findOne({
      where: { title: "A multipart discussion" },
      rejectOnEmpty: true,
    })
    expect(response.body).toEqual({
      thread: {
        id: createdThread.id,
        authorId: author.id,
        title: "A multipart discussion",
        body: "Text fields without file uploads",
      },
    })
  })

  test("when an authenticated caller requests an unknown API path as HTML, returns JSON not found", async () => {
    // Arrange
    const caller = await userFactory.create({
      username: "alice",
    })
    const token = await login(caller.username)
    const route = request(app)
      .get("/api/missing")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "text/html")

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
