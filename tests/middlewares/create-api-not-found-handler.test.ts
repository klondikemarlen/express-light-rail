import express from "express"
import request from "supertest"

import { createApiNotFoundHandler } from "@/middlewares/create-api-not-found-handler.js"

describe("src/middlewares/create-api-not-found-handler.ts", () => {
  test("when an API path is missing, it returns JSON instead of the website fallback", async () => {
    // Arrange
    const app = express()
    const apiRouter = express.Router()
    apiRouter.use(createApiNotFoundHandler())
    app.use("/api", apiRouter)
    app.use((_request, response) => response.send("website"))

    // Act
    const response = await request(app).get("/api/missing")

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

  test("when an API route matches, it keeps the route response", async () => {
    // Arrange
    const app = express()
    const apiRouter = express.Router()
    apiRouter.get("/users", (_request, response) => {
      response.json({ users: [] })
    })
    apiRouter.use(createApiNotFoundHandler())
    app.use("/api", apiRouter)

    // Act
    const response = await request(app).get("/api/users")

    // Assert
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ users: [] })
  })

  test("when a request is outside the API, it reaches the website fallback", async () => {
    // Arrange
    const app = express()
    app.use("/api", createApiNotFoundHandler())
    app.use((_request, response) => response.send("website"))

    // Act
    const response = await request(app).get("/about")

    // Assert
    expect(response.status).toBe(200)
    expect(response.text).toBe("website")
  })
})
