import { NextFunction, Request, Response } from "express"
import { Attributes, Model, WhereOptions } from "@sequelize/core"

import {
  buildFilterScopes,
  buildOrder,
  buildWhere,
  determineLimit,
  getPagination,
  type ModelOrder,
} from "@/base-controller/api-helpers/index.js"

import logger from "@/utils/logger.js"

import { type BaseScopeOptions } from "@/base-policy/index.js"
import BaseApiError from "@/base-controller/base-api-error.js"

export { BaseApiError }
export type { ModelOrder }

export type Actions = "index" | "show" | "new" | "edit" | "create" | "update" | "destroy"

/** Keep in sync with web/src/api/base-api.ts */

// See https://guides.rubyonrails.org/routing.html#crud-verbs-and-actions
export class API<TModel extends Model = never, ControllerRequest extends Request = Request> {
  protected request: ControllerRequest
  protected response: Response
  protected next: NextFunction

  constructor(req: Request, res: Response, next: NextFunction) {
    // Assumes authorization has occured first in
    // api/src/middlewares/jwt-middleware.ts and api/src/middlewares/authorization-middleware.ts
    // At some future point it would make sense to do all that logic as
    // controller actions to avoid the need for hack
    this.request = req as ControllerRequest
    this.response = res as Response
    this.next = next
  }

  static createActionHandler(action: Actions & keyof API) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const controllerInstance = new this(req, res, next)
        const result = await controllerInstance[action]()
        return result
      } catch (error: unknown) {
        if (error instanceof BaseApiError) {
          logger.error(error.message, { error })
          return res.status(error.statusCode).json({
            message: error.message,
          })
        } else {
          logger.error(`Internal Server Error: ${error}`, { error })
          return res.status(500).json({
            message: `Internal Server Error: ${error}`,
          })
        }
      }
    }
  }

  /**
   * Maps route to API#index()
   *
   * @example
   * app.route("/api/users").get(UsersController.index)
   */
  static get index() {
    return this.createActionHandler("index")
  }

  /**
   * Maps route to API#create()
   *
   * @example
   * app.route("/api/users").post(UsersController.create)
   */
  static get create() {
    return this.createActionHandler("create")
  }

  /**
   * Maps route to API#show()
   *
   * @example
   * app.route("/api/users/:userId").get(UsersController.show)
   */
  static get show() {
    return this.createActionHandler("show")
  }

  /**
   * Maps route to API#update()
   *
   * @example
   * app.route("/api/users/:userId").patch(UsersController.update)
   */
  static get update() {
    return this.createActionHandler("update")
  }

  /**
   * Maps route to API#destroy()
   *
   * @example
   * app.route("/api/users/:userId").delete(UsersController.destroy)
   */
  static get destroy() {
    return this.createActionHandler("destroy")
  }

  async index(): Promise<unknown> {
    throw new BaseApiError("Not Implemented")
  }

  async create(): Promise<unknown> {
    throw new BaseApiError("Not Implemented")
  }

  async show(): Promise<unknown> {
    throw new BaseApiError("Not Implemented")
  }

  async update(): Promise<unknown> {
    throw new BaseApiError("Not Implemented")
  }

  async destroy(): Promise<unknown> {
    throw new BaseApiError("Not Implemented")
  }

  // Internal helpers
  get params() {
    return this.request.params
  }

  get query() {
    return this.request.query
  }

  get pagination() {
    return getPagination(this.query)
  }

  buildWhere<TModelOverride extends Model = TModel>(
    overridableOptions: WhereOptions<Attributes<TModelOverride>> = {},
    nonOverridableOptions: WhereOptions<Attributes<TModelOverride>> = {}
  ): WhereOptions<Attributes<TModelOverride>> {
    return buildWhere<TModelOverride>(
      this.query,
      overridableOptions,
      nonOverridableOptions
    )
  }

  buildFilterScopes<FilterOptions extends Record<string, unknown>>(
    initialScopes: BaseScopeOptions[] = []
  ): BaseScopeOptions[] {
    return buildFilterScopes<FilterOptions>(this.query, initialScopes)
  }

  buildOrder(
    overridableOrder: ModelOrder[] = [],
    nonOverridableOrder: ModelOrder[] = []
  ): ModelOrder[] | undefined {
    return buildOrder(this.query, overridableOrder, nonOverridableOrder)
  }

  private determineLimit(perPage: number) {
    return determineLimit(perPage)
  }
}

export default API
