import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const fixtureRequire = createRequire(pathToFileURL(resolve(process.cwd(), "package.json")))
const commonJsEntry = fixtureRequire.resolve("express-light-rail")
const esmEntry = pathToFileURL(join(dirname(commonJsEntry), "index.js"))
const { BaseApiError, BaseService, createApiErrorHandler } = await import(esmEntry.href)

class Service extends BaseService {
  perform() {
    return "esm-ok"
  }
}

assert.equal(Service.perform(), "esm-ok")
assert.equal(new BaseApiError("bad", "safe").toJSON().error.code, "bad")
assert.equal(typeof createApiErrorHandler, "function")
console.log("ESM package smoke passed")
