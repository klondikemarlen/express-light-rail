import { NextFunction, Request, Response } from "express"
import { Attributes, Model, Order, WhereOptions } from "@sequelize/core"
import { isEmpty, isNil } from "lodash"

import logger from "@/utils/logger.js"

import { type BaseScopeOptions } from "@/base-policy/index.js"
import BaseApiError from "@/base-controller/base-api-error.js"
import {
  type HttpStatusSymbol,
  type HttpStatusCode,
  toStatusCode,
} from "@/base-controller/http-status-codes.js"
import StrongParameters from "@/base-controller/strong-parameters.js"

export { BaseApiError, StrongParameters }

export type Actions = "index" | "show" | "new" | "edit" | "create" | "update" | "destroy"

export type FilterConfig = {
  method: string
  only?: Actions[]
  except?: Actions[]
}

export type RescueFromConfig = {
  error: new (...args: any[]) => Error
  with: string
}

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

  // Rails-style action filters
  static beforeAction: FilterConfig[] = []
  static afterAction: FilterConfig[] = []
  static skipBeforeAction: string[] = []
  static skipAfterAction: string[] = []

  // Rails-style exception handling
  static rescueFrom: RescueFromConfig[] = []

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
      const controllerInstance = new this(req, res, next)

      try {
        // Run before action filters (with skip support)
        const beforeFilters = this.getFiltersWithInheritance("beforeAction", "skipBeforeAction")
        await this.runFilters(controllerInstance, beforeFilters, action)

        // Run the main action
        const result = await controllerInstance[action]()

        // Run after action filters (with skip support)
        const afterFilters = this.getFiltersWithInheritance("afterAction", "skipAfterAction")
        await this.runFilters(controllerInstance, afterFilters, action)

        return result
      } catch (error: unknown) {
        // Try rescue_from handlers first
        const rescueHandler = this.findRescueHandler(error)
        if (rescueHandler) {
          const handler = (controllerInstance as any)[rescueHandler.with]
          if (typeof handler === "function") {
            return await handler.call(controllerInstance, error)
          }
        }

        // Fall back to default error handling
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

  private static findRescueHandler(error: unknown): RescueFromConfig | null {
    // Walk up the prototype chain to find a matching rescue_from handler
    let currentClass: any = this
    while (currentClass && currentClass !== API) {
      const rescueFromConfigs = currentClass.rescueFrom || []
      for (const config of rescueFromConfigs) {
        if (error instanceof config.error) {
          return config
        }
      }
      currentClass = Object.getPrototypeOf(currentClass)
    }
    return null
  }

  private static getFiltersWithInheritance(
    filterProp: "beforeAction" | "afterAction",
    skipProp: "skipBeforeAction" | "skipAfterAction"
  ): FilterConfig[] {
    const allFilters: FilterConfig[] = []
    const skipFilters: string[] = (this as any)[skipProp] || []

    // Walk up the prototype chain to collect all filters (from parent to child)
    const classChain: any[] = []
    let currentClass: any = this
    while (currentClass && currentClass !== API) {
      classChain.push(currentClass)
      currentClass = Object.getPrototypeOf(currentClass)
    }

    // Add filters from parent to child (reverse chain)
    // Only include filters that are directly defined on the class, not inherited
    for (let i = classChain.length - 1; i >= 0; i--) {
      if (Object.prototype.hasOwnProperty.call(classChain[i], filterProp)) {
        const filters = classChain[i][filterProp] || []
        allFilters.push(...filters)
      }
    }

    // Filter out skipped filters
    return allFilters.filter((filter) => !skipFilters.includes(filter.method))
  }

  private static shouldRunFilter(filter: FilterConfig, action: Actions): boolean {
    if (filter.only && !filter.only.includes(action)) {
      return false
    }
    if (filter.except && filter.except.includes(action)) {
      return false
    }
    return true
  }

  private static async runFilters(
    instance: API,
    filters: FilterConfig[],
    action: Actions
  ): Promise<void> {
    for (const filter of filters) {
      if (this.shouldRunFilter(filter, action)) {
        const method = (instance as any)[filter.method]
        if (typeof method === "function") {
          await method.call(instance)
        } else {
          logger.warn(`Filter method '${filter.method}' not found on controller`)
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

  /**
   * Strong parameters for filtering request body
   * Rails equivalent: params.require(:user).permit(:name, :email)
   *
   * @example
   * const userParams = this.strongParams.require("user").permit(["name", "email"])
   */
  get strongParams() {
    return new StrongParameters(this.request.body || {})
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

  // Response helpers

  /**
   * Renders JSON response with optional status code
   * Rails equivalent: render json: data, status: :ok
   *
   * @example
   * return this.render({ user }, 'created')
   * return this.render({ error: 'Not found' }, 404)
   */
  protected render(
    data: Record<string, unknown> | unknown[],
    status: HttpStatusSymbol | HttpStatusCode = "ok"
  ) {
    const statusCode = toStatusCode(status)
    return this.response.status(statusCode).json(data)
  }

  /**
   * Sends empty response with status code
   * Rails equivalent: head :not_found
   *
   * @example
   * return this.head('no_content')
   * return this.head(404)
   */
  protected head(status: HttpStatusSymbol | HttpStatusCode) {
    const statusCode = toStatusCode(status)
    return this.response.status(statusCode).send()
  }

  /**
   * Redirects to specified path with optional status code
   * Rails equivalent: redirect_to path, status: :found
   *
   * @example
   * return this.redirect('/users', 'found')
   * return this.redirect('/login', 302)
   */
  protected redirect(path: string, status: HttpStatusSymbol | HttpStatusCode = "found") {
    const statusCode = toStatusCode(status)
    return this.response.redirect(statusCode, path)
  }

  private determineLimit(perPage: number) {
    if (perPage === MAX_PER_PAGE_EQUIVALENT) {
      return MAX_PER_PAGE
    }

    return Math.max(1, Math.min(perPage, MAX_PER_PAGE))
  }
}

export default API
