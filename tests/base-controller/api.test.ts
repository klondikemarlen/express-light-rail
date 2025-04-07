import express from "express"
import request from "supertest"

import API, { BaseApiError } from "@/base-controller/api.js"

describe("src/base-controller/api.ts", () => {
  describe("API", () => {
    let app: express.Application

    beforeEach(() => {
      app = express()
    })

    describe(".index", () => {
      beforeEach(() => {
        app.route("/example-api").get(API.index)
      })

      test("when called, executes the index action", async () => {
        const response = await request(app).get("/example-api").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".create", () => {
      beforeEach(() => {
        app.route("/example-api").post(API.create)
      })

      test("when called, executes the create action", async () => {
        const response = await request(app).post("/example-api").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".show", () => {
      beforeEach(() => {
        app.route("/example-api/:someParam").get(API.show)
      })

      test("when called, executes the show action", async () => {
        const response = await request(app).get("/example-api/1").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".update", () => {
      beforeEach(() => {
        app.route("/example-api/:someParam").put(API.update)
      })

      test("when called, executes the update action", async () => {
        const response = await request(app).put("/example-api/1").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".destroy", () => {
      beforeEach(() => {
        app.route("/example-api/:someParam").delete(API.destroy)
      })

      test("when called, executes the destroy action", async () => {
        const response = await request(app).delete("/example-api/1").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
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

      beforeEach(() => {
        app.route("/example-api").post(ExampleController.create)
      })

      test("when action errors with an known API error, returns the error", async () => {
        const response = await request(app).post("/example-api").send()

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          message: "Missing some attribute",
        })
      })
    })
  })
})
