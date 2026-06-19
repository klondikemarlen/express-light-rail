import express, { type Request, type Response } from "express"
import supertest from "supertest"

import { resourceRoutes } from "@/base-router/index.js"

describe("src/base-router/resource-routes.ts", () => {
  describe("resourceRoutes", () => {
    test("mounts standard RESTful collection and member routes", async () => {
      // Arrange
      const app = express()
      const router = express.Router()
      const controller = {
        index: (_request: Request, response: Response) => response.json({ action: "index" }),
        create: (_request: Request, response: Response) => response.json({ action: "create" }),
        show: (_request: Request, response: Response) => response.json({ action: "show" }),
        update: (_request: Request, response: Response) => response.json({ action: "update" }),
        destroy: (_request: Request, response: Response) => response.json({ action: "destroy" }),
      }

      resourceRoutes(router, "/api/users", controller)
      app.use(router)

      // Act / Assert
      await supertest(app).get("/api/users").expect(200, { action: "index" })
      await supertest(app).post("/api/users").expect(200, { action: "create" })
      await supertest(app).get("/api/users/1").expect(200, { action: "show" })
      await supertest(app).patch("/api/users/1").expect(200, { action: "update" })
      await supertest(app).delete("/api/users/1").expect(200, { action: "destroy" })
    })

    test("uses custom member parameter names", async () => {
      // Arrange
      const app = express()
      const router = express.Router()
      const controller = {
        show: (request: Request, response: Response) => {
          return response.json({ id: request.params.userId })
        },
      }

      resourceRoutes(router, "/api/users", controller, {
        idParam: "userId",
        only: ["show"],
      })
      app.use(router)

      // Act / Assert
      await supertest(app).get("/api/users/7").expect(200, { id: "7" })
    })

    test("mounts only the requested routes", async () => {
      // Arrange
      const app = express()
      const router = express.Router()
      const controller = {
        index: (_request: Request, response: Response) => response.json({ action: "index" }),
      }

      resourceRoutes(router, "/api/users", controller, {
        only: ["index"],
      })
      app.use(router)

      // Act / Assert
      await supertest(app).get("/api/users").expect(200, { action: "index" })
      await supertest(app).post("/api/users").expect(404)
    })

    test("does not mount excepted routes", async () => {
      // Arrange
      const app = express()
      const router = express.Router()
      const controller = {
        index: (_request: Request, response: Response) => response.json({ action: "index" }),
        create: (_request: Request, response: Response) => response.json({ action: "create" }),
        show: (_request: Request, response: Response) => response.json({ action: "show" }),
        update: (_request: Request, response: Response) => response.json({ action: "update" }),
        destroy: (_request: Request, response: Response) => response.json({ action: "destroy" }),
      }

      resourceRoutes(router, "/api/users", controller, {
        except: ["destroy"],
      })
      app.use(router)

      // Act / Assert
      await supertest(app).delete("/api/users/1").expect(404)
      await supertest(app).patch("/api/users/1").expect(200, { action: "update" })
    })

    test("fails when a requested action is missing", () => {
      // Arrange
      const router = express.Router()
      const controller = {}

      // Act / Assert
      expect(() => resourceRoutes(router, "/api/users", controller)).toThrow(
        "Expected controller to define index route handler."
      )
    })
  })
})
