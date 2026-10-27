import { NextFunction, Request, Response } from "express"
import { Attributes, Model, WhereOptions } from "@sequelize/core"

import {
  buildFilterScopes,
  buildOrder,
  buildPagination,
  buildWhere,
  type ModelOrder,
} from "@/base-controller/api-helpers/index.js"

import { type BaseScopeOptions } from "@/base-policy/index.js"
import { BaseApiError } from "@/base-controller/base-api-error.js"
import { requestAbortSignal } from "@/base-controller/request-abort-signal.js"


export type Actions = "index" | "show" | "new" | "edit" | "create" | "update" | "destroy"


// See https://guides.rubyonrails.org/routing.html#crud-verbs-and-actions
export class BaseController<TModel extends Model = never, ControllerRequest extends Request = Request> {
  protected request: ControllerRequest & { signal: AbortSignal }
  protected response: Response
  protected next: NextFunction

  constructor(req: Request, res: Response, next: NextFunction) {
    requestAbortSignal(req, res)
    // Authentication and project-specific request fields are established by the host.
    this.request = req as ControllerRequest & { signal: AbortSignal }
    this.response = res
    this.next = next
  }

  static createActionHandler(action: Actions & keyof BaseController) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const controllerInstance = new this(req, res, next)
        const result = await controllerInstance[action]()
        return result
      } catch (error: unknown) {
        return next(error)
      }
    }
  }

  /**
   * Maps route to BaseController#index()
   *
   * @example
   * app.route("/api/users").get(UsersController.index)
   */
  static get index() {
    return this.createActionHandler("index")
  }

  /**
   * Maps route to BaseController#create()
   *
   * @example
   * app.route("/api/users").post(UsersController.create)
   */
  static get create() {
    return this.createActionHandler("create")
  }

  /**
   * Maps route to BaseController#show()
   *
   * @example
   * app.route("/api/users/:userId").get(UsersController.show)
   */
  static get show() {
    return this.createActionHandler("show")
  }

  /**
   * Maps route to BaseController#update()
   *
   * @example
   * app.route("/api/users/:userId").patch(UsersController.update)
   */
  static get update() {
    return this.createActionHandler("update")
  }

  /**
   * Maps route to BaseController#destroy()
   *
   * @example
   * app.route("/api/users/:userId").delete(UsersController.destroy)
   */
  static get destroy() {
    return this.createActionHandler("destroy")
  }

  async index(): Promise<unknown> {
    throw new BaseApiError("not_implemented", "Not Implemented")
  }

  async create(): Promise<unknown> {
    throw new BaseApiError("not_implemented", "Not Implemented")
  }

  async show(): Promise<unknown> {
    throw new BaseApiError("not_implemented", "Not Implemented")
  }

  async update(): Promise<unknown> {
    throw new BaseApiError("not_implemented", "Not Implemented")
  }

  async destroy(): Promise<unknown> {
    throw new BaseApiError("not_implemented", "Not Implemented")
  }

  // Internal helpers
  protected get signal(): AbortSignal {
    return this.request.signal
  }

  get params() {
    return this.request.params
  }

  get query() {
    return this.request.query
  }

  get pagination() {
    return buildPagination(this.query)
  }

  buildWhere<TModelOverride extends Model = TModel>(
    overridableOptions: WhereOptions<Attributes<TModelOverride>> = {},
    nonOverridableOptions: WhereOptions<Attributes<TModelOverride>> = {}
  ): WhereOptions<Attributes<TModelOverride>> {
    return buildWhere<TModelOverride>(
      this.query.where,
      overridableOptions,
      nonOverridableOptions
    )
  }

  buildFilterScopes<FilterOptions extends Record<string, unknown>>(
    initialScopes: BaseScopeOptions[] = []
  ): BaseScopeOptions[] {
    return buildFilterScopes<FilterOptions>(this.query.filters, initialScopes)
  }

  buildOrder(
    overridableOrder: ModelOrder[] = [],
    nonOverridableOrder: ModelOrder[] = []
  ): ModelOrder[] | undefined {
    return buildOrder(this.query.order, overridableOrder, nonOverridableOrder)
  }

}

