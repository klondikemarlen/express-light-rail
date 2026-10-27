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
