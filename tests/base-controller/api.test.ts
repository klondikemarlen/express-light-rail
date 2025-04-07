import express from "express"
import request from "supertest"

import { testWithCustomLogLevel } from "@tests/support/index.js"

import API, { BaseApiError } from "@/base-controller/api.js"

describe("src/base-controller/api.ts", () => {
  describe("API", () => {
    let app: express.Application

    beforeEach(() => {
      app = express()
    })

    describe(".index", () => {
      testWithCustomLogLevel("when called, executes the index action", async ({ setLogLevel }) => {
        // Arrange
        setLogLevel("silent")

        app.route("/example-api").get(API.index)

        // act
        const response = await request(app).get("/example-api").send()

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".create", () => {
      testWithCustomLogLevel("when called, executes the create action", async ({ setLogLevel }) => {
        // Arrange
        setLogLevel("silent")

        app.route("/example-api").post(API.create)

        // Act
        const response = await request(app).post("/example-api").send()

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".show", () => {
      testWithCustomLogLevel("when called, executes the show action", async ({ setLogLevel }) => {
        // Arrange
        setLogLevel("silent")

        app.route("/example-api/:someParam").get(API.show)

        // Act
        const response = await request(app).get("/example-api/1").send()

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".update", () => {
      testWithCustomLogLevel("when called, executes the update action", async ({ setLogLevel }) => {
        // Arrange
        setLogLevel("silent")

        app.route("/example-api/:someParam").put(API.update)

        // Act
        const response = await request(app).put("/example-api/1").send()

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".destroy", () => {
      testWithCustomLogLevel(
        "when called, executes the destroy action",
        async ({ setLogLevel }) => {
          // Arrange
          setLogLevel("silent")

          app.route("/example-api/:someParam").delete(API.destroy)

          // Act
          const response = await request(app).delete("/example-api/1").send()

          // Assert
          expect(response.status).toBe(500)
          expect(response.body).toMatchObject({
            message: "Not Implemented",
          })
        }
      )
    })

    describe("error handling", () => {
      class ValidationError extends BaseApiError {
        constructor(
          message: string,
          public statusCode: number = 400
        ) {
          super(message, statusCode)
        }
      }

      class ExampleController extends API {
        async create() {
          throw new ValidationError("Missing some attribute")
        }
      }

      testWithCustomLogLevel("when action errors with an known API error, returns the error", async ({ setLogLevel }) => {
        // Arrange
        setLogLevel("silent")

        app.route("/example-api").post(ExampleController.create)

        // Act
        const response = await request(app).post("/example-api").send()

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          message: "Missing some attribute",
        })
      })
    })
  })
})
