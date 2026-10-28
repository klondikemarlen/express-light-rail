import type { RequestHandler } from "express"

const hoistableAuthorizationToken = "HOISTABLE_AUTHORIZATION_TOKEN"

export const hoistAuthorizationToken: RequestHandler = (request, _response, next) => {
  const body: unknown = request.body
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    const hasBodyCredential = Object.prototype.hasOwnProperty.call(body, hoistableAuthorizationToken)
    const credential: unknown = hasBodyCredential
      ? Reflect.get(body, hoistableAuthorizationToken)
      : undefined

    Reflect.deleteProperty(body, hoistableAuthorizationToken)

    if (request.headers.authorization === undefined && typeof credential === "string") {
      const token = credential.trim()
      if (token) {
        request.headers.authorization = /^Bearer\s/i.test(token) ? token : `Bearer ${token}`
      }
    }
  }

  next()
}
