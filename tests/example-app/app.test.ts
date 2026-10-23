import request from "supertest"
import { beforeEach, describe, expect, test } from "vitest"

import { resetTasks } from "@example-app/domain.js"

import { app } from "@example-app/app.js"

beforeEach(() => resetTasks())

describe("runnable Express adoption example", () => {
  test("when a status filter is supplied, it intersects the current-user policy", async () => {
    // Arrange
    const route = request(app).get("/api/tasks").set("x-user-id", "alice").query({ status: "open" })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(200)
    expect(response.body.tasks).toEqual([
      { id: 1, title: "Review access", status: "open", visibility: "private" },
    ])
  })

  test("when an authorized user creates a task, the route returns the new task", async () => {
    // Arrange
    const route = request(app)
      .post("/api/tasks")
      .set("x-user-id", "alice")
      .send({ title: "Allowed", status: "open", visibility: "private" })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    expect(response.body.task).toMatchObject({
      title: "Allowed",
      status: "open",
      visibility: "private",
    })
  })

  test("when an unauthorized user creates a task, the route denies it", async () => {
    // Arrange
    const route = request(app)
      .post("/api/tasks")
      .set("x-user-id", "bob")
      .send({ title: "Blocked", status: "open" })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe("forbidden")
  })

  test("when route work fails unexpectedly, the response hides its error message", async () => {
    // Arrange
    const route = request(app).get("/api/tasks").set("x-user-id", "alice").query({ fail: "true" })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe("internal_server_error")
    expect(JSON.stringify(response.body)).not.toContain("Internal demo failure")
  })
})
