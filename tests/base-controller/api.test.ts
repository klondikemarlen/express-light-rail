import express from "express"
import request from "supertest"

import API from "@/base-controller/api.js"

describe("src/base-controller/api.ts", () => {
  describe("API", () => {
    const app = express()

    describe(".index", () => {
      app.route("/example-api").get(API.index)

      test("when called, executes the index action", async () => {
        const response = await request(app).get("/example-api").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".create", () => {
      app.route("/example-api").post(API.create)

      test("when called, executes the create action", async () => {
        const response = await request(app).post("/example-api").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".show", () => {
      app.route("/example-api/:someParam").get(API.show)

      test("when called, executes the show action", async () => {
        const response = await request(app).get("/example-api/1").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".update", () => {
      app.route("/example-api/:someParam").put(API.update)

      test("when called, executes the update action", async () => {
        const response = await request(app).put("/example-api/1").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })

    describe(".destroy", () => {
      app.route("/example-api/:someParam").delete(API.destroy)

      test("when called, executes the destroy action", async () => {
        const response = await request(app).delete("/example-api/1").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })
  })
})
