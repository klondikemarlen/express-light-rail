import { NextFunction, Request, Response } from "express"
import { Attributes, Model, Order, WhereOptions } from "@sequelize/core"
import { isEmpty, isNil } from "lodash"

import logger from "@/utils/logger.js"

import { type BaseScopeOptions } from "@/base-policy/index.js"
import BaseApiError from "@/base-controller/base-api-error.js"

export { BaseApiError }

export type Actions = "index" | "show" | "new" | "edit" | "create" | "update" | "destroy"

/** Keep in sync with web/src/api/base-api.ts */
export type ModelOrder = Order &
  (
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
  )

// Keep in sync with web/src/api/base-api.ts
const MAX_PER_PAGE = 1000
const MAX_PER_PAGE_EQUIVALENT = -1
const DEFAULT_PER_PAGE = 10

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
    const page = parseInt(this.query.page?.toString() || "") || 1
    const perPage = parseInt(this.query.perPage?.toString() || "") || DEFAULT_PER_PAGE
    const limit = this.determineLimit(perPage)
    const offset = (page - 1) * limit
    return {
      page,
      perPage,
      limit,
      offset,
    }
  }

  buildWhere<TModelOverride extends Model = TModel>(
    overridableOptions: WhereOptions<Attributes<TModelOverride>> = {},
    nonOverridableOptions: WhereOptions<Attributes<TModelOverride>> = {}
  ): WhereOptions<Attributes<TModelOverride>> {
    // TODO: consider if we should add parsing of Sequelize [Op.is] and [Op.not] here
    // or in the api/src/utils/enhanced-qs-decoder.ts function
    const queryWhere = this.query.where as WhereOptions<Attributes<TModelOverride>>
    return {
      ...overridableOptions,
      ...queryWhere,
      ...nonOverridableOptions,
    } as WhereOptions<Attributes<TModelOverride>>
  }

  buildFilterScopes<FilterOptions extends Record<string, unknown>>(
    initialScopes: BaseScopeOptions[] = []
  ): BaseScopeOptions[] {
    const filters = this.query.filters as FilterOptions
    const scopes = initialScopes
    if (!isEmpty(filters)) {
      Object.entries(filters).forEach(([key, value]) => {
        scopes.push({ method: [key, value] })
      })
    }

    return scopes
  }

  buildOrder(
    overridableOrder: ModelOrder[] = [],
    nonOverridableOrder: ModelOrder[] = []
  ): ModelOrder[] | undefined {
    const orderQuery = this.query.order as unknown as ModelOrder[] | undefined

    if (isNil(orderQuery)) {
      return [...nonOverridableOrder, ...overridableOrder]
    }

    return [...nonOverridableOrder, ...orderQuery, ...overridableOrder]
  }

  private determineLimit(perPage: number) {
    if (perPage === MAX_PER_PAGE_EQUIVALENT) {
      return MAX_PER_PAGE
    }

    return Math.max(1, Math.min(perPage, MAX_PER_PAGE))
  }
}

export default API
