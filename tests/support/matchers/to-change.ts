export async function toChange<ComparatorResult = unknown>(
  operation: () => Promise<void>,
  comparator: () => Promise<ComparatorResult>,
  { from, to }: { from: ComparatorResult; to: ComparatorResult }
) {
  const initialResult = await comparator()
  if (initialResult !== from) {
    return {
      message: () => `expected initial result to be ${from}, but got ${initialResult}`,
      pass: false,
    }
  }

  if (!(operation instanceof Function)) {
    return {
      message: () => `must pass a function to expect when using toChange matcher`,
      pass: false,
    }
  }

  await operation()

  const finalResult = await comparator()
  if (finalResult !== to) {
    return {
      message: () =>
        `expected final result to change from ${from} to ${to}, but changed to ${finalResult}`,
      pass: false,
    }
  }

  return {
    message: () => `expected final result not to change from ${from} to ${to}`,
    pass: true,
  }
}

export default toChange
