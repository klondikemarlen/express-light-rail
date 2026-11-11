import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"

import { Comment } from "@example-app/models/index.js"
import { commentFactory } from "@tests/example-app/factories/comment-factory.js"
import { threadFactory } from "@tests/example-app/factories/thread-factory.js"
import {
  cleanExampleDatabase,
  closeExampleDatabase,
  prepareExampleDatabase,
} from "@tests/support/example-database.js"

import { DestroyService } from "@example-app/services/threads/destroy-service.js"

beforeAll(prepareExampleDatabase)
beforeEach(cleanExampleDatabase)

afterAll(closeExampleDatabase)

describe("Threads.DestroyService", () => {
  test("when thread deletion fails, reports the failure", async () => {
    // Arrange
    const thread = await threadFactory.create()
    vi.spyOn(thread, "destroy").mockRejectedValueOnce(new Error("Thread deletion failed"))

    // Act and Assert
    await expect(DestroyService.perform(thread)).rejects.toThrow("Thread deletion failed")
  })

  test("when thread deletion fails, rolls back its comments' soft deletion", async () => {
    // Arrange
    const thread = await threadFactory.create()
    const comment = await commentFactory.create({ threadId: thread.id })
    const deletionFailure = new Error("Thread deletion failed")
    vi.spyOn(thread, "destroy").mockRejectedValueOnce(deletionFailure)

    // Act
    try {
      await DestroyService.perform(thread)
    } catch (error) {
      if (error !== deletionFailure) throw error
    }

    // Assert
    const persistedComment = await Comment.findByPk(comment.id, { rejectOnEmpty: true })
    expect(persistedComment.deletedAt).toBeNull()
  })
})
