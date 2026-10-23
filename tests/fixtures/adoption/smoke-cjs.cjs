const assert = require("node:assert/strict")
const { createRequire } = require("node:module")
const { resolve } = require("node:path")
const { pathToFileURL } = require("node:url")

const fixtureRequire = createRequire(pathToFileURL(resolve(process.cwd(), "package.json")))
const { BaseApiError, BaseService, createApiErrorHandler } = fixtureRequire("express-light-rail")

class Service extends BaseService {
  perform() {
    return "cjs-ok"
  }
}

assert.equal(Service.perform(), "cjs-ok")
assert.equal(new BaseApiError("bad", "safe").toJSON().error.code, "bad")
assert.equal(typeof createApiErrorHandler, "function")
console.log("CommonJS package smoke passed")
