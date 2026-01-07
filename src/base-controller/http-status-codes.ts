/**
 * HTTP status codes mapped to Rails-style symbols
 * Based on Rails ActionDispatch::Http::STATUS_CODES
 */

export const HTTP_STATUS_CODES = {
  // 2xx Success
  ok: 200,
  created: 201,
  accepted: 202,
  non_authoritative_information: 203,
  no_content: 204,
  reset_content: 205,
  partial_content: 206,
  multi_status: 207,
  already_reported: 208,
  im_used: 226,

  // 3xx Redirection
  multiple_choices: 300,
  moved_permanently: 301,
  found: 302,
  see_other: 303,
  not_modified: 304,
  use_proxy: 305,
  temporary_redirect: 307,
  permanent_redirect: 308,

  // 4xx Client Error
  bad_request: 400,
  unauthorized: 401,
  payment_required: 402,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  not_acceptable: 406,
  proxy_authentication_required: 407,
  request_timeout: 408,
  conflict: 409,
  gone: 410,
  length_required: 411,
  precondition_failed: 412,
  payload_too_large: 413,
  uri_too_long: 414,
  unsupported_media_type: 415,
  range_not_satisfiable: 416,
  expectation_failed: 417,
  im_a_teapot: 418,
  misdirected_request: 421,
  unprocessable_entity: 422,
  locked: 423,
  failed_dependency: 424,
  upgrade_required: 426,
  precondition_required: 428,
  too_many_requests: 429,
  request_header_fields_too_large: 431,
  unavailable_for_legal_reasons: 451,

  // 5xx Server Error
  internal_server_error: 500,
  not_implemented: 501,
  bad_gateway: 502,
  service_unavailable: 503,
  gateway_timeout: 504,
  http_version_not_supported: 505,
  variant_also_negotiates: 506,
  insufficient_storage: 507,
  loop_detected: 508,
  not_extended: 510,
  network_authentication_required: 511,
} as const

export type HttpStatusSymbol = keyof typeof HTTP_STATUS_CODES
export type HttpStatusCode = (typeof HTTP_STATUS_CODES)[HttpStatusSymbol]

/**
 * Converts a status symbol or number to a status code number
 * @param status - HTTP status code number or symbol
 * @returns HTTP status code number
 */
export function toStatusCode(status: HttpStatusSymbol | HttpStatusCode | number): number {
  if (typeof status === "number") {
    return status
  }
  return HTTP_STATUS_CODES[status as HttpStatusSymbol] ?? 500
}

export default HTTP_STATUS_CODES
