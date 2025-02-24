import { NextFunction, Request, Response } from "express"
import { Attributes, Model, Order, WhereOptions } from "@sequelize/core"
import { isEmpty, isNil } from "lodash"

import { type BaseScopeOptions } from "@/base-policy/index.js"
import BaseAPIError from "@/base-controller/base-api-error.js"

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

  static get index() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const controllerInstance = new this(req, res, next)
      return controllerInstance.index().catch((error) => {
        if (error instanceof BaseAPIError) {
          res.status(error.statusCode).json({
            message: error.message,
          })
        } else {
          next(error)
        }
      })
    }
  }

  // Usage app.post("/api/users", UsersController.create)
  // maps /api/users to UsersController#create()
  static get create() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const controllerInstance = new this(req, res, next)
      return controllerInstance.create().catch((error) => {
        if (error instanceof BaseAPIError) {
          res.status(error.statusCode).json({
            message: error.message,
          })
        } else {
          next(error)
        }
      })
    }
  }

  static get show() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const controllerInstance = new this(req, res, next)
      return controllerInstance.show().catch((error) => {
        if (error instanceof BaseAPIError) {
          res.status(error.statusCode).json({
            message: error.message,
          })
        } else {
          next(error)
        }
      })
    }
  }

  static get update() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const controllerInstance = new this(req, res, next)
      return controllerInstance.update().catch((error) => {
        if (error instanceof BaseAPIError) {
          res.status(error.statusCode).json({
            message: error.message,
          })
        } else {
          next(error)
        }
      })
    }
  }

  static get destroy() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const controllerInstance = new this(req, res, next)
      return controllerInstance.destroy().catch((error) => {
        if (error instanceof BaseAPIError) {
          res.status(error.statusCode).json({
            message: error.message,
          })
        } else {
          next(error)
        }
      })
    }
  }

  async index(): Promise<unknown> {
    throw new BaseAPIError("Not Implemented")
  }

  async create(): Promise<unknown> {
    throw new BaseAPIError("Not Implemented")
  }

  async show(): Promise<unknown> {
    throw new BaseAPIError("Not Implemented")
  }

  async update(): Promise<unknown> {
    throw new BaseAPIError("Not Implemented")
  }

  async destroy(): Promise<unknown> {
    throw new BaseAPIError("Not Implemented")
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
