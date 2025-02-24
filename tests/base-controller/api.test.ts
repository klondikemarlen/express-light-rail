import express from "express"
import request from "supertest"

import API from "@/base-controller/api.js"

describe("src/base-controller/api.ts", () => {
  describe("API", () => {
    const app = express()

    describe(".index", () => {
      app.route("/base-api").get(API.index)

      test("when called, executes the index action", async () => {
        const response = await request(app).get("/base-api").send()

        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          message: "Not Implemented",
        })
      })
    })
  })
})
