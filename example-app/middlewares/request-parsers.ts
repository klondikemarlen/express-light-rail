import type { IncomingMessage } from "node:http"

import { BaseApiError } from "express-light-rail"
import express, { type RequestHandler } from "express"
import multer from "multer"
import qs from "qs"

const encodedUrlBodies = new WeakMap<IncomingMessage, string>()

const nestedFieldOptions = {
  allowPrototypes: false,
  arrayLimit: 20,
  depth: 5,
  duplicates: "combine",
  ignoreQueryPrefix: true,
  parameterLimit: 100,
  parseArrays: true,
  plainObjects: true,
  strictDepth: true,
  throwOnLimitExceeded: true,
} satisfies qs.IParseOptions

export const jsonBodyParser = express.json({ limit: "100kb" })

export const urlEncodedBodyParser = express.urlencoded({
  extended: false,
  limit: "100kb",
  parameterLimit: 100,
  verify(request, _response, buffer) {
    encodedUrlBodies.set(request, buffer.toString("utf8"))
  },
})

const multipartBodyParser = multer({
  limits: {
    fieldNameSize: 100,
    fieldSize: 64 * 1024,
    fields: 100,
    fileSize: 1024 * 1024,
    files: 0,
    parts: 100,
  },
}).none()

function normalizeBooleanValues(value: unknown): unknown {
  if (value === "true") return true
  if (value === "false") return false
  if (Array.isArray(value)) return value.map(normalizeBooleanValues)

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => [key, normalizeBooleanValues(childValue)])
    )
  }

  return value
}

function parseNestedFields(encoded: string): Record<string, unknown> {
  const parsed = qs.parse(encoded, nestedFieldOptions)
  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, normalizeBooleanValues(value)])
  )
}

export function parseBoundedQuery(query: string): Record<string, unknown> {
  try {
    return parseNestedFields(query)
  } catch {
    throw new BaseApiError("invalid_input", "Invalid query parameters", {}, 400)
  }
}

function appendFieldPairs(key: string, value: unknown, fields: [string, string][]): void {
  if (typeof value === "string") {
    fields.push([key, value])
    return
  }

  if (Array.isArray(value)) {
    for (const [index, childValue] of value.entries()) {
      const childKey = key.endsWith("[]") ? key : `${key}[${index}]`
      appendFieldPairs(childKey, childValue, fields)
    }
    return
  }

  if (value !== null && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      appendFieldPairs(`${key}[${childKey}]`, childValue, fields)
    }
  }
}

function hasValidUrlEncoding(encoded: string): boolean {
  try {
    decodeURIComponent(encoded.replace(/\+/g, " "))
    return true
  } catch {
    return false
  }
}

const oversizedMultipartErrorCodes: Record<string, true> = {
  LIMIT_FIELD_VALUE: true,
  LIMIT_FILE_COUNT: true,
  LIMIT_FILE_SIZE: true,
  LIMIT_FIELD_COUNT: true,
  LIMIT_PART_COUNT: true,
}

function multipartError(error: unknown): BaseApiError {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return new BaseApiError("invalid_input", "File uploads are not accepted", {}, 400)
    }

    if (oversizedMultipartErrorCodes[error.code]) {
      return new BaseApiError("invalid_request", "Payload too large", {}, 413)
    }
  }

  return new BaseApiError("invalid_input", "Invalid multipart request", {}, 400)
}

export const parseMultipartBody: RequestHandler = (request, response, next) => {
  if (!request.is("multipart/form-data")) {
    next()
    return
  }

  multipartBodyParser(request, response, (error: unknown) => {
    if (error) {
      next(multipartError(error))
      return
    }

    next()
  })
}

export const normalizeFormBody: RequestHandler = (request, _response, next) => {
  const isUrlEncoded = request.is("application/x-www-form-urlencoded")
  const isMultipart = request.is("multipart/form-data")
  if (!isUrlEncoded && !isMultipart) {
    next()
    return
  }

  if (isUrlEncoded) {
    const encodedBody = encodedUrlBodies.get(request)
    if (encodedBody !== undefined && !hasValidUrlEncoding(encodedBody)) {
      next(new BaseApiError("invalid_input", "Invalid form body", {}, 400))
      return
    }
  }

  const body: unknown = request.body
  if (body === undefined) {
    next()
    return
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    next(new BaseApiError("invalid_input", "Expected form fields", {}, 400))
    return
  }

  try {
    const fields: [string, string][] = []
    for (const [key, value] of Object.entries(body)) {
      appendFieldPairs(key, value, fields)
    }

    const encodedFields = new URLSearchParams(fields).toString()
    request.body = parseNestedFields(encodedFields)
    next()
  } catch {
    next(new BaseApiError("invalid_input", "Invalid form fields", {}, 400))
  }
}
