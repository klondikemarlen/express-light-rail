import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"

import { db, Comment, Thread } from "@example-app/models/index.js"
import { commentFactory } from "@tests/example-app/factories/comment-factory.js"
import { threadFactory } from "@tests/example-app/factories/thread-factory.js"
import { cleanExampleDatabase, prepareExampleDatabase } from "@tests/support/example-database.js"

import { DestroyService } from "@example-app/services/threads/destroy-service.js"

beforeAll(prepareExampleDatabase)
beforeEach(cleanExampleDatabase)

afterAll(async () => {
  await db.close()
})

describe("Threads.DestroyService", () => {
  test("when thread deletion fails, rolls back its comments' soft deletion", async () => {
    // Arrange
    const thread = await threadFactory.create()
    const comment = await commentFactory.create({ threadId: thread.id })
    vi.spyOn(thread, "destroy").mockRejectedValueOnce(new Error("Thread deletion failed"))

    // Act and Assert
    await expect(DestroyService.perform(thread)).rejects.toThrow("Thread deletion failed")
    const persistedThread = await Thread.findByPk(thread.id, { rejectOnEmpty: true })
    const persistedComment = await Comment.findByPk(comment.id, { rejectOnEmpty: true })
    expect(persistedThread.deletedAt).toBeNull()
    expect(persistedComment.deletedAt).toBeNull()
  })
})
