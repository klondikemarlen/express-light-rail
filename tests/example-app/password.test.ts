import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"

import { db, User } from "@example-app/models/index.js"

import {
  cleanExampleDatabase,
  closeExampleDatabase,
  prepareExampleDatabase,
} from "@tests/support/example-database.js"

beforeAll(prepareExampleDatabase)
beforeEach(cleanExampleDatabase)

afterAll(closeExampleDatabase)

describe("User passwords", () => {
  test("when created with a password, authenticates the persisted user", async () => {
    // Arrange
    const attributes = { username: "alice", name: "Alice", password: "alice-password" }

    // Act
    const user = await User.create(attributes)

    // Assert
    const persistedUser = await User.findByPk(user.id, { rejectOnEmpty: true })
    expect(await persistedUser.authenticate("alice-password")).toBe(persistedUser)
  })

  test("when created with a password, persists a salted password hash", async () => {
    // Arrange
    const attributes = { username: "alice", name: "Alice", password: "alice-password" }

    // Act
    const user = await User.create(attributes)

    // Assert
    const persistedUser = await User.findByPk(user.id, { rejectOnEmpty: true })
    expect(persistedUser.passwordHash).toMatch(/^scrypt\$v1\$/)
  })

  test("when a password is saved, clears plaintext from the original instance", async () => {
    // Arrange
    const attributes = { username: "alice", name: "Alice", password: "alice-password" }

    // Act
    const user = await User.create(attributes)

    // Assert
    expect(user.password).toBeUndefined()
  })

  test("when a user is reloaded, does not expose the saved plaintext password", async () => {
    // Arrange
    const user = await User.create({
      username: "alice",
      name: "Alice",
      password: "alice-password",
    })

    // Act
    const persistedUser = await User.findByPk(user.id, { rejectOnEmpty: true })

    // Assert
    expect(persistedUser.password).toBeUndefined()
  })

  test("when the users schema is migrated, has no plaintext password column", async () => {
    // Arrange: beforeAll applies the application's migrations.

    // Act
    const columns = await db.queryInterface.describeTable("users")

    // Assert
    expect(columns).not.toHaveProperty("password")
  })

  test("when a password is updated, accepts the new password", async () => {
    // Arrange
    const user = await User.create({ username: "alice", name: "Alice", password: "old-password" })

    // Act
    await user.update({ password: "new-password" })

    // Assert
    const persistedUser = await User.findByPk(user.id, { rejectOnEmpty: true })
    expect(await persistedUser.authenticate("new-password")).toBe(persistedUser)
  })

  test("when a password is updated, rejects the previous password", async () => {
    // Arrange
    const user = await User.create({ username: "alice", name: "Alice", password: "old-password" })

    // Act
    await user.update({ password: "new-password" })

    // Assert
    const persistedUser = await User.findByPk(user.id, { rejectOnEmpty: true })
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

  test("when a replacement password is empty, rejects the update", async () => {
    // Arrange
    const user = await User.create({ username: "alice", name: "Alice", password: "alice-password" })

    // Act / Assert
    await expect(user.update({ password: "" })).rejects.toThrow(
      "password must be a non-empty string"
    )
  })

  test("when a replacement password is rejected, preserves the persisted credential", async () => {
    // Arrange
    const user = await User.create({ username: "alice", name: "Alice", password: "alice-password" })

    // Act
    try {
      await user.update({ password: "" })
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("password must be a non-empty string")
      ) {
        throw error
      }
    }

    // Assert
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
