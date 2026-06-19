import { type RequestHandler, type Router } from "express"

export type ResourceRouteAction = "index" | "create" | "show" | "update" | "destroy"

export type ResourceController = Partial<Record<ResourceRouteAction, RequestHandler>>

export type ResourceRoutesOptions = {
  idParam?: string
  only?: readonly ResourceRouteAction[]
  except?: readonly ResourceRouteAction[]
}

const COLLECTION_ACTIONS = ["index", "create"] as const
const MEMBER_ACTIONS = ["show", "update", "destroy"] as const

export function resourceRoutes(
  router: Router,
  path: string,
  controller: ResourceController,
  options: ResourceRoutesOptions = {}
): Router {
  const idParam = options.idParam ?? "id"
  const memberPath = `${path}/:${idParam}`

  if (shouldMount("index", options)) {
    const handler = requiredHandler(controller, "index")
    router.route(path).get(handler)
  }

  if (shouldMount("create", options)) {
    const handler = requiredHandler(controller, "create")
    router.route(path).post(handler)
  }

  if (shouldMount("show", options)) {
    const handler = requiredHandler(controller, "show")
    router.route(memberPath).get(handler)
  }

  if (shouldMount("update", options)) {
    const handler = requiredHandler(controller, "update")
    router.route(memberPath).patch(handler)
  }

  if (shouldMount("destroy", options)) {
    const handler = requiredHandler(controller, "destroy")
    router.route(memberPath).delete(handler)
  }

  return router
}

function shouldMount(action: ResourceRouteAction, options: ResourceRoutesOptions): boolean {
  if (options.only !== undefined) {
    return options.only.includes(action)
  }

  if (options.except !== undefined) {
    return !options.except.includes(action)
  }

  return true
}

function requiredHandler(
  controller: ResourceController,
  action: ResourceRouteAction
): RequestHandler {
  const handler = controller[action]
  if (handler === undefined) {
    throw new Error(`Expected controller to define ${action} route handler.`)
  }

  return handler
}

export const collectionActions = COLLECTION_ACTIONS
export const memberActions = MEMBER_ACTIONS
