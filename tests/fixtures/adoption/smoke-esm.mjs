import assert from "node:assert/strict"
import { BaseApiError, BaseService, createApiErrorHandler } from "express-light-rail"

class Service extends BaseService {
  perform() {
    return "esm-ok"
  }
}

assert.equal(Service.perform(), "esm-ok")
assert.equal(new BaseApiError("bad", "safe").toJSON().error.code, "bad")
assert.equal(typeof createApiErrorHandler, "function")
console.log("ESM package smoke passed")
