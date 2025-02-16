import {
  cloneDeep,
  isArray,
  isBoolean,
  isNull,
  isNumber,
  isObject,
  isString,
  isUndefined,
} from "lodash"

export type Path =
  | string
  | {
      [key: string]: (string | Path)[]
    }

/*
Usage:
const object = {
  a: 1,
  b: 2,
  c: {
    d: 4,
    f: 5,
  },
  g: [
    {
      h: 6,
      i: 7,
    },
    {
      h: 8,
      i: 9,
    }
  ],
}

const picked = deepPick(object, ["a", { c: ["d"] }, { g: ["h"] }]);
console.log(picked); // Output: { a: 1, c: { d: 4 }, g: [{ h: 6 }, { h: 8 }] }

TODO: figure out how to do this without "any"
*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepPick(object: any, paths: Path[]): any {
  if (isArray(object)) {
    return object.map((item) => deepPick(item, paths))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return paths.reduce((result: any, path: Path) => {
    if (isString(path)) {
      if (path in object === false) return result

      const value = cloneDeep(object[path])
      if (isSimpleType(value)) {
        result[path] = value
        return result
      } else if (isArray(value) && value.every(isSimpleType)) {
        result[path] = value
        return result
      } else if (isArray(value) && value.every(isObject)) {
        result[path] = []
        return result
      } else if (isObject(value)) {
        result[path] = {}
        return result
      } else {
        throw new Error(`Unsupported value type at path: ${path} -> ${JSON.stringify(value)}`)
      }
    } else if (isObject(path)) {
      Object.entries(path).forEach(([path, nestedPaths]) => {
        if (path in object === false) return

        const value = cloneDeep(object[path])
        if (isSimpleType(value)) {
          result[path] = value
        } else if (isArray(value) && value.every(isSimpleType)) {
          result[path] = value
        } else if (Array.isArray(value) && value.every(isObject)) {
          result[path] = value.map((item) => deepPick(item, nestedPaths))
        } else if (isObject(value)) {
          result[path] = deepPick(value, nestedPaths)
        } else {
          throw new Error(
            `Unsupported value structure at path: ${path} ->  ${JSON.stringify(value)}`
          )
        }
      })

      return result
    } else {
      throw new Error(`Unsupported path type: ${path}`)
    }
  }, {})
}

function isSimpleType(value: unknown) {
  return (
    isString(value) || isNumber(value) || isBoolean(value) || isNull(value) || isUndefined(value)
  )
}
