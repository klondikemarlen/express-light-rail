import { isArray, isObject } from "lodash"

export function extractRecord<T extends Record<string, unknown>>(input: unknown): Partial<T> | undefined {
  return isObject(input) && !isArray(input) ? (input as Partial<T>) : undefined
}

export function extractArray<T>(input: unknown): T[] | undefined {
  return isArray(input) ? (input as T[]) : undefined
}
