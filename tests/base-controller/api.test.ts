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

    describe("response helpers", () => {
      describe("#render", () => {
        class RenderController extends API {
          async index() {
            return this.render({ message: "Hello" }, "ok")
          }

          async create() {
            return this.render({ user: { id: 1 } }, "created")
          }
        }

        testWithCustomLogLevel("renders JSON with symbolic status", async ({ setLogLevel }) => {
          setLogLevel("silent")
          app.route("/test").get(RenderController.index)

          const response = await request(app).get("/test").send()

          expect(response.status).toBe(200)
          expect(response.body).toEqual({ message: "Hello" })
        })

        testWithCustomLogLevel("renders JSON with created status", async ({ setLogLevel }) => {
          setLogLevel("silent")
          app.route("/test").post(RenderController.create)

          const response = await request(app).post("/test").send()

          expect(response.status).toBe(201)
          expect(response.body).toEqual({ user: { id: 1 } })
        })
      })

      describe("#head", () => {
        class HeadController extends API {
          async show() {
            return this.head("no_content")
          }

          async destroy() {
            return this.head("not_found")
          }
        }

        testWithCustomLogLevel("returns empty response with no_content status", async ({ setLogLevel }) => {
          setLogLevel("silent")
          app.route("/test").get(HeadController.show)

          const response = await request(app).get("/test").send()

          expect(response.status).toBe(204)
          expect(response.text).toBe("")
        })

        testWithCustomLogLevel("returns empty response with not_found status", async ({ setLogLevel }) => {
          setLogLevel("silent")
          app.route("/test").delete(HeadController.destroy)

          const response = await request(app).delete("/test").send()

          expect(response.status).toBe(404)
          expect(response.text).toBe("")
        })
      })

      describe("#redirect", () => {
        class RedirectController extends API {
          async create() {
            return this.redirect("/users/1", "found")
          }

          async show() {
            return this.redirect("/login", "see_other")
          }
        }

        testWithCustomLogLevel("redirects to path with found status", async ({ setLogLevel }) => {
          setLogLevel("silent")
          app.route("/test").post(RedirectController.create)

          const response = await request(app).post("/test").send()

          expect(response.status).toBe(302)
          expect(response.headers.location).toBe("/users/1")
        })

        testWithCustomLogLevel("redirects to path with see_other status", async ({ setLogLevel }) => {
          setLogLevel("silent")
          app.route("/test").get(RedirectController.show)

          const response = await request(app).get("/test").send()

          expect(response.status).toBe(303)
          expect(response.headers.location).toBe("/login")
        })
      })
    })

    describe("action filters", () => {
      describe("beforeAction", () => {
        testWithCustomLogLevel("runs before action filter", async ({ setLogLevel }) => {
          setLogLevel("silent")

          const callOrder: string[] = []

          class FilterController extends API {
            static beforeAction = [{ method: "logBefore" }]

            logBefore() {
              callOrder.push("before")
            }

            async index() {
              callOrder.push("index")
              return this.render({ message: "ok" })
            }
          }

          app.route("/test").get(FilterController.index)
          await request(app).get("/test").send()

          expect(callOrder).toEqual(["before", "index"])
        })

        testWithCustomLogLevel("runs only on specified actions with 'only'", async ({ setLogLevel }) => {
          setLogLevel("silent")

          const callOrder: string[] = []

          class FilterController extends API {
            static beforeAction = [{ method: "logBefore", only: ["create" as const] }]

            logBefore() {
              callOrder.push("before")
            }

            async index() {
              callOrder.push("index")
              return this.render({ message: "index" })
            }

            async create() {
              callOrder.push("create")
              return this.render({ message: "create" })
            }
          }

          app.route("/test").get(FilterController.index)
          app.route("/test").post(FilterController.create)

          // Index should not run the filter
          await request(app).get("/test").send()
          expect(callOrder).toEqual(["index"])

          callOrder.length = 0

          // Create should run the filter
          await request(app).post("/test").send()
          expect(callOrder).toEqual(["before", "create"])
        })

        testWithCustomLogLevel("skips specified actions with 'except'", async ({ setLogLevel }) => {
          setLogLevel("silent")

          const callOrder: string[] = []

          class FilterController extends API {
            static beforeAction = [{ method: "logBefore", except: ["index" as const] }]

            logBefore() {
              callOrder.push("before")
            }

            async index() {
              callOrder.push("index")
              return this.render({ message: "index" })
            }

            async create() {
              callOrder.push("create")
              return this.render({ message: "create" })
            }
          }

          app.route("/test").get(FilterController.index)
          app.route("/test").post(FilterController.create)

          // Index should not run the filter
          await request(app).get("/test").send()
          expect(callOrder).toEqual(["index"])

          callOrder.length = 0

          // Create should run the filter
          await request(app).post("/test").send()
          expect(callOrder).toEqual(["before", "create"])
        })
      })

      describe("afterAction", () => {
        testWithCustomLogLevel("runs after action filter", async ({ setLogLevel }) => {
          setLogLevel("silent")

          const callOrder: string[] = []

          class FilterController extends API {
            static afterAction = [{ method: "logAfter" }]

            logAfter() {
              callOrder.push("after")
            }

            async index() {
              callOrder.push("index")
              return this.render({ message: "ok" })
            }
          }

          app.route("/test").get(FilterController.index)
          await request(app).get("/test").send()

          expect(callOrder).toEqual(["index", "after"])
        })
      })

      describe("async filters", () => {
        testWithCustomLogLevel("supports async filter methods", async ({ setLogLevel }) => {
          setLogLevel("silent")

          const callOrder: string[] = []

          class FilterController extends API {
            static beforeAction = [{ method: "asyncBefore" }]

            async asyncBefore() {
              await new Promise((resolve) => setTimeout(resolve, 10))
              callOrder.push("async-before")
            }

            async index() {
              callOrder.push("index")
              return this.render({ message: "ok" })
            }
          }

          app.route("/test").get(FilterController.index)
          await request(app).get("/test").send()

          expect(callOrder).toEqual(["async-before", "index"])
        })
      })

      describe("filter errors", () => {
        testWithCustomLogLevel("halts execution when filter throws error", async ({ setLogLevel }) => {
          setLogLevel("silent")

          const callOrder: string[] = []

          class FilterController extends API {
            static beforeAction = [{ method: "throwError" }]

            throwError() {
              callOrder.push("error-thrown")
              throw new BaseApiError("Unauthorized", 401)
            }

            async index() {
              callOrder.push("index")
              return this.render({ message: "ok" })
            }
          }

          app.route("/test").get(FilterController.index)
          const response = await request(app).get("/test").send()

          expect(callOrder).toEqual(["error-thrown"])
          expect(response.status).toBe(401)
          expect(response.body).toMatchObject({
            message: "Unauthorized",
          })
        })
      })
    })

    describe("skip filters", () => {
      testWithCustomLogLevel("skips inherited before action filters", async ({ setLogLevel }) => {
        setLogLevel("silent")

        const callOrder: string[] = []

        class ParentController extends API {
          static beforeAction = [{ method: "parentBefore" }]

          parentBefore() {
            callOrder.push("parent-before")
          }

          async index() {
            callOrder.push("index")
            return this.render({ message: "ok" })
          }
        }

        class ChildController extends ParentController {
          static skipBeforeAction = ["parentBefore"]
        }

        app.route("/test").get(ChildController.index)
        await request(app).get("/test").send()

        // Should skip the parent filter
        expect(callOrder).toEqual(["index"])
      })

      testWithCustomLogLevel("skips inherited after action filters", async ({ setLogLevel }) => {
        setLogLevel("silent")

        const callOrder: string[] = []

        class ParentController extends API {
          static afterAction = [{ method: "parentAfter" }]

          parentAfter() {
            callOrder.push("parent-after")
          }

          async index() {
            callOrder.push("index")
            return this.render({ message: "ok" })
          }
        }

        class ChildController extends ParentController {
          static skipAfterAction = ["parentAfter"]
        }

        app.route("/test").get(ChildController.index)
        await request(app).get("/test").send()

        // Should skip the parent filter
        expect(callOrder).toEqual(["index"])
      })

      testWithCustomLogLevel("inherits filters but applies skip", async ({ setLogLevel }) => {
        setLogLevel("silent")

        const callOrder: string[] = []

        class ParentController extends API {
          static beforeAction = [
            { method: "filter1" },
            { method: "filter2" }
          ]

          filter1() {
            callOrder.push("filter1")
          }

          filter2() {
            callOrder.push("filter2")
          }

          async index() {
            callOrder.push("index")
            return this.render({ message: "ok" })
          }
        }

        class ChildController extends ParentController {
          static skipBeforeAction = ["filter1"]
        }

        app.route("/test").get(ChildController.index)
        await request(app).get("/test").send()

        // Should run filter2 but skip filter1
        expect(callOrder).toEqual(["filter2", "index"])
      })
    })

    describe("rescue_from", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = "CustomError"
        }
      }

      class AnotherError extends Error {
        constructor(message: string) {
          super(message)
          this.name = "AnotherError"
        }
      }

      testWithCustomLogLevel("rescues custom errors with handler", async ({ setLogLevel }) => {
        setLogLevel("silent")

        class RescueController extends API {
          static rescueFrom = [
            { error: CustomError, with: "handleCustomError" }
          ]

          handleCustomError(error: CustomError) {
            return this.render({ error: error.message }, "bad_request")
          }

          async index() {
            throw new CustomError("Something went wrong")
          }
        }

        app.route("/test").get(RescueController.index)
        const response = await request(app).get("/test").send()

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          error: "Something went wrong"
        })
      })

      testWithCustomLogLevel("matches specific error types", async ({ setLogLevel }) => {
        setLogLevel("silent")

        const handlers: string[] = []

        class RescueController extends API {
          static rescueFrom = [
            { error: CustomError, with: "handleCustomError" },
            { error: AnotherError, with: "handleAnotherError" }
          ]

          handleCustomError(error: CustomError) {
            handlers.push("custom")
            return this.render({ error: error.message }, "bad_request")
          }

          handleAnotherError(error: AnotherError) {
            handlers.push("another")
            return this.render({ error: error.message }, "internal_server_error")
          }

          async index() {
            throw new AnotherError("Another error")
          }
        }

        app.route("/test").get(RescueController.index)
        const response = await request(app).get("/test").send()

        expect(handlers).toEqual(["another"])
        expect(response.status).toBe(500)
      })

      testWithCustomLogLevel("inherits rescue_from from parent", async ({ setLogLevel }) => {
        setLogLevel("silent")

        class ParentController extends API {
          static rescueFrom = [
            { error: CustomError, with: "handleError" }
          ]

          handleError(error: Error) {
            return this.render({ error: error.message }, "bad_request")
          }

          async index() {
            return this.render({ message: "ok" })
          }
        }

        class ChildController extends ParentController {
          async index() {
            throw new CustomError("Child error")
          }
        }

        app.route("/test").get(ChildController.index)
        const response = await request(app).get("/test").send()

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          error: "Child error"
        })
      })

      testWithCustomLogLevel("falls back to default error handling if no rescue_from matches", async ({ setLogLevel }) => {
        setLogLevel("silent")

        class RescueController extends API {
          static rescueFrom = [
            { error: CustomError, with: "handleCustomError" }
          ]

          handleCustomError(error: CustomError) {
            return this.render({ error: error.message }, "bad_request")
          }

          async index() {
            throw new BaseApiError("API Error", 422)
          }
        }

        app.route("/test").get(RescueController.index)
        const response = await request(app).get("/test").send()

        // Should fall back to default BaseApiError handling
        expect(response.status).toBe(422)
        expect(response.body).toMatchObject({
          message: "API Error"
        })
      })
    })

    describe("strong parameters", () => {
      testWithCustomLogLevel("requires parameter and permits specific keys", async ({ setLogLevel }) => {
        setLogLevel("silent")

        class StrongParamsController extends API {
          async create() {
            const userParams = this.strongParams.require("user").permit(["name", "email"])
            return this.render({ params: userParams }, "created")
          }
        }

        app.use(express.json())
        app.route("/test").post(StrongParamsController.create)

        const response = await request(app)
          .post("/test")
          .send({
            user: {
              name: "John",
              email: "john@example.com",
              password: "secret"
            }
          })

        expect(response.status).toBe(201)
        expect(response.body.params).toEqual({
          name: "John",
          email: "john@example.com"
        })
        expect(response.body.params.password).toBeUndefined()
      })

      testWithCustomLogLevel("throws error when required parameter is missing", async ({ setLogLevel }) => {
        setLogLevel("silent")

        class StrongParamsController extends API {
          async create() {
            const userParams = this.strongParams.require("user").permit(["name"])
            return this.render({ params: userParams }, "created")
          }
        }

        app.use(express.json())
        app.route("/test").post(StrongParamsController.create)

        const response = await request(app)
          .post("/test")
          .send({ other: "data" })

        expect(response.status).toBe(400)
        expect(response.body.message).toContain("Parameter 'user' is required")
      })

      testWithCustomLogLevel("handles empty objects", async ({ setLogLevel }) => {
        setLogLevel("silent")

        class StrongParamsController extends API {
          async create() {
            const userParams = this.strongParams.require("user").permit(["name"])
            return this.render({ params: userParams })
          }
        }

        app.use(express.json())
        app.route("/test").post(StrongParamsController.create)

        const response = await request(app)
          .post("/test")
          .send({ user: {} })

        expect(response.status).toBe(200)
        expect(response.body.params).toEqual({})
      })
    })
  })
})
