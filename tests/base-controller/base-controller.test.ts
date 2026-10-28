import express from "express"
import request from "supertest"

import { createApiErrorHandler } from "@/middlewares/create-api-error-handler.js"

import { BaseApiError } from "@/base-controller/base-api-error.js"

import { BaseController } from "@/base-controller/base-controller.js"

describe("BaseController", () => {
  describe("Express actions", () => {
    let app: express.Application

    beforeEach(() => {
      app = express()
    })

    describe(".index", () => {
      test("when index is not implemented, it returns a public error", async () => {
        // Arrange

        app.route("/example-api").get(BaseController.index)
        app.use(createApiErrorHandler())

        // Act
        const response = await request(app).get("/example-api").send()

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          error: {
            code: "not_implemented",
            msg: "Not Implemented",
            meta: {},
          },
        })
      })
    })

    describe(".create", () => {
      test("when create is not implemented, it returns a public error", async () => {
        // Arrange

        app.route("/example-api").post(BaseController.create)
        app.use(createApiErrorHandler())

        // Act
        const response = await request(app).post("/example-api").send()

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          error: {
            code: "not_implemented",
            msg: "Not Implemented",
            meta: {},
          },
        })
      })
    })

    describe(".show", () => {
      test("when show is not implemented, it returns a public error", async () => {
        // Arrange

        app.route("/example-api/:someParam").get(BaseController.show)
        app.use(createApiErrorHandler())

        // Act
        const response = await request(app).get("/example-api/1").send()

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          error: {
            code: "not_implemented",
            msg: "Not Implemented",
            meta: {},
          },
        })
      })
    })

    describe(".update", () => {
      test("when update is not implemented, it returns a public error", async () => {
        // Arrange

        app.route("/example-api/:someParam").put(BaseController.update)
        app.use(createApiErrorHandler())

        // Act
        const response = await request(app).put("/example-api/1").send()

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          error: {
            code: "not_implemented",
            msg: "Not Implemented",
            meta: {},
          },
        })
      })
    })

    describe(".destroy", () => {
      test("when destroy is not implemented, it returns a public error", async () => {
        // Arrange
        app.route("/example-api/:someParam").delete(BaseController.destroy)
        app.use(createApiErrorHandler())

        // Act
        const response = await request(app).delete("/example-api/1").send()

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          error: {
            code: "not_implemented",
            msg: "Not Implemented",
            meta: {},
          },
        })
      })
    })

    describe(".buildOrder", () => {
      test("when query and defaults repeat a column, it keeps the highest priority order", async () => {
        // Arrange
        class OrderedController extends BaseController {
          async index() {
            return this.response.json(this.buildOrder([["name", "ASC"]], [["id", "ASC"]]))
          }
        }

        app.get("/ordered", OrderedController.index)

        // Act
        const response = await request(app)
          .get("/ordered")
          .query("order[0][0]=name&order[0][1]=DESC&order[1][0]=id&order[1][1]=DESC")

        // Assert
        expect(response.body).toEqual([
          ["id", "ASC"],
          ["name", "DESC"],
        ])
      })
    })

    describe("beforeAction", () => {
      test("when application preparation is asynchronous, inherited actions receive prepared context", async () => {
        // Arrange
        class ApplicationController extends BaseController {
          protected username?: string

          protected override async beforeAction(): Promise<void> {
            await Promise.resolve()
            this.username = this.request.get("x-user")
          }
        }

        class UsersController extends ApplicationController {
          private displayName?: string

          protected override async beforeAction(): Promise<void> {
            await super.beforeAction()
            this.displayName = this.username?.toUpperCase()
          }

          async show() {
            return this.response.json({
              username: this.username,
              displayName: this.displayName,
            })
          }
        }

        app.get("/user", UsersController.show)

        // Act
        const response = await request(app).get("/user").set("x-user", "alice")

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toEqual({
          username: "alice",
          displayName: "ALICE",
        })
      })

      test("when preparation throws, returns the error instead of performing the action", async () => {
        // Arrange
        class ProtectedController extends BaseController {
          protected override beforeAction(): void {
            throw new BaseApiError("unauthorized", "Authentication required", {}, 401)
          }

          async create() {
            return this.response.status(201).json({
              created: true,
            })
          }
        }

        app.post("/protected", ProtectedController.create)
        app.use(createApiErrorHandler())

        // Act
        const response = await request(app).post("/protected")

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

      test("when asynchronous preparation rejects, passes the failure to Express error handling", async () => {
        // Arrange
        class ProtectedController extends BaseController {
          protected override async beforeAction(): Promise<void> {
            await Promise.resolve()
            throw new BaseApiError("forbidden", "Access denied", {}, 403)
          }

          async update() {
            return this.response.json({
              updated: true,
            })
          }
        }

        app.patch("/protected", ProtectedController.update)
        app.use(createApiErrorHandler())

        // Act
        const response = await request(app).patch("/protected")

        // Assert
        expect(response.status).toBe(403)
        expect(response.body).toEqual({
          error: {
            code: "forbidden",
            msg: "Access denied",
            meta: {},
          },
        })
      })

      test("when preparation responds, preserves its response without running the action", async () => {
        // Arrange
        class RedirectController extends BaseController {
          protected override beforeAction(): void {
            this.response.redirect("/sign-in")
          }

          async index() {
            return this.response.json({
              privateContent: "Must not be sent",
            })
          }
        }

        app.get("/protected", RedirectController.index)

        // Act
        const response = await request(app).get("/protected")

        // Assert
        expect(response.status).toBe(302)
        expect(response.headers.location).toBe("/sign-in")
      })

      test("when requests prepare concurrently, keeps each request's identity isolated", async () => {
        // Arrange
        const ready = Promise.withResolvers<void>()
        let entered = 0
        class UsersController extends BaseController {
          private username?: string

          protected override async beforeAction(): Promise<void> {
            this.username = this.request.get("x-user")
            entered += 1
            if (entered === 2) ready.resolve()
            await ready.promise
          }

          async show() {
            return this.response.json({
              username: this.username,
            })
          }
        }

        app.get("/user", UsersController.show)

        // Act
        const [aliceResponse, bobResponse] = await Promise.all([
          request(app).get("/user").set("x-user", "alice"),
          request(app).get("/user").set("x-user", "bob"),
        ])

        // Assert
        expect(aliceResponse.body).toEqual({
          username: "alice",
        })
        expect(bobResponse.body).toEqual({
          username: "bob",
        })
      })
    })

    describe("error handling", () => {
      class ValidationError extends BaseApiError {
        constructor(message: string) {
          super("validation_failed", message, { field: "someAttribute" }, 400)
        }
      }

      class ExampleController extends BaseController {
        async create() {
          throw new ValidationError("Missing some attribute")
        }
      }

      test("when an action raises a public error, it preserves the error response", async () => {
        // Arrange

        app.route("/example-api").post(ExampleController.create)
        app.use(createApiErrorHandler())

        // Act
        const response = await request(app).post("/example-api").send()

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          error: {
            code: "validation_failed",
            msg: "Missing some attribute",
            meta: {
              field: "someAttribute",
            },
          },
        })
      })

      test("when an action rejects, existing Express error middleware can handle it", async () => {
        // Arrange
        const originalError = new Error("private service failure")

        class FailingController extends BaseController {
          async create() {
            throw originalError
          }
        }

        app.route("/example-api").post(FailingController.create)
        app.use(
          (
            error: unknown,
            _request: express.Request,
            response: express.Response,
            next: express.NextFunction
          ) => {
            if (error !== originalError) return next(error)

            return response.status(503).json({ message: "Try again later" })
          }
        )

        // Act
        const response = await request(app).post("/example-api").send()

        // Assert
        expect(response.status).toBe(503)
        expect(response.body).toEqual({ message: "Try again later" })
      })
    })
  })
})
