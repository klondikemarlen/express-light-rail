import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"

import { db, User } from "@example-app/models/index.js"

import { cleanExampleDatabase, prepareExampleDatabase } from "@tests/support/example-database.js"

beforeAll(prepareExampleDatabase)
beforeEach(cleanExampleDatabase)

afterAll(async () => {
  await db.close()
})

describe("User passwords", () => {
  test("when created with a password, authenticates the persisted user without storing plaintext", async () => {
    // Arrange
    const attributes = { username: "alice", name: "Alice", password: "alice-password" }

    // Act
    const user = await User.create(attributes)

    // Assert
    const persistedUser = await User.findByPk(user.id, { rejectOnEmpty: true })
    expect(await persistedUser.authenticate("alice-password")).toBe(persistedUser)
    expect(persistedUser.passwordHash).toMatch(/^scrypt\$v1\$/)
    expect(persistedUser.createdAt).toBeInstanceOf(Date)
    expect(persistedUser.updatedAt).toBeInstanceOf(Date)
    expect(persistedUser.deletedAt).toBeNull()
    expect(user.password).toBeUndefined()
    expect(persistedUser.password).toBeUndefined()
    const columns = await db.queryInterface.describeTable("users")
    expect(columns).not.toHaveProperty("password")
    expect(columns).toHaveProperty("password_hash")
    expect(columns).toHaveProperty("created_at")
    expect(columns).toHaveProperty("updated_at")
    expect(columns).toHaveProperty("deleted_at")
    expect(columns).not.toHaveProperty("passwordHash")
  })

  test("when a password is updated, accepts the new password and rejects the old one", async () => {
    // Arrange
    const user = await User.create({ username: "alice", name: "Alice", password: "old-password" })

    // Act
    await user.update({ password: "new-password" })

    // Assert
    const persistedUser = await User.findByPk(user.id, { rejectOnEmpty: true })
    expect(await persistedUser.authenticate("new-password")).toBe(persistedUser)
    expect(await persistedUser.authenticate("old-password")).toBe(false)
  })

  test("when an unrelated field changes, preserves the existing password hash", async () => {
    // Arrange
    const user = await User.create({ username: "alice", name: "Alice", password: "alice-password" })
    const originalHash = user.passwordHash

    // Act
    await user.update({ name: "Alice Updated" })

    // Assert
    const persistedUser = await User.findByPk(user.id, { rejectOnEmpty: true })
    expect(persistedUser.passwordHash).toBe(originalHash)
  })

  test("when a replacement password is empty, leaves the persisted credential unchanged", async () => {
    // Arrange
    const user = await User.create({ username: "alice", name: "Alice", password: "alice-password" })

    // Act / Assert
    await expect(user.update({ password: "" })).rejects.toThrow(
      "password must be a non-empty string"
    )
    const persistedUser = await User.findByPk(user.id, { rejectOnEmpty: true })
    expect(await persistedUser.authenticate("alice-password")).toBe(persistedUser)
  })

  test("when a legacy user has no credential, cannot authenticate", async () => {
    // Arrange
    const user = await User.create({ username: "legacy", name: "Legacy" })

    // Act
    const authenticatedUser = await user.authenticate("alice-password")

    // Assert
    expect(authenticatedUser).toBe(false)
  })

  test("when two users choose the same password, stores independently salted hashes", async () => {
    // Arrange
    const password = "shared-password"

    // Act
    const alice = await User.create({ username: "alice", name: "Alice", password })
    const bob = await User.create({ username: "bob", name: "Bob", password })

    // Assert
    expect(alice.passwordHash).not.toBe(bob.passwordHash)
  })
})
