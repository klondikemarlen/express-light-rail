export function extractRecord<T>(input: unknown): T | undefined {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return undefined
  }

  return input as T
}

export function extractArray<T>(input: unknown): T[] | undefined {
  if (!Array.isArray(input)) {
    return undefined
  }

  return input as T[]
}
