import supertest, { AgentOptions } from "supertest"
import { App } from "supertest/types.js"

import defaultApp from "@example-app/app.js"

export function request(options?: AgentOptions | undefined, app: App = defaultApp) {
  return supertest(app, options)
}

export default request
