import { afterAll, beforeEach, describe, expect, test, vi } from "vitest"

const { originalStorage } = vi.hoisted(() => {
  const originalStorage = process.env.EXAMPLE_DATABASE_STORAGE
  process.env.EXAMPLE_DATABASE_STORAGE = ":memory:"
  return { originalStorage }
})

import { db, User } from "@example-app/models/index.js"

beforeEach(async () => {
  await db.sync({ force: true })
})

afterAll(async () => {
  await db.close()
  if (originalStorage === undefined) delete process.env.EXAMPLE_DATABASE_STORAGE
  else process.env.EXAMPLE_DATABASE_STORAGE = originalStorage
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
    expect(user.password).toBeUndefined()
    expect(persistedUser.password).toBeUndefined()
    const columns = await db.queryInterface.describeTable("users")
    expect(columns).not.toHaveProperty("password")
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
