import { deepPick } from "@/utils/deep-pick"

describe("api/src/utils/deep-pick.ts", () => {
  describe(".deepPick", () => {
    test("when given a simple object, it filters by object by suplied keys", () => {
      // Arrange
      const object = {
        a: 1,
        b: 2,
        c: 3,
      }

      // Act
      const result = deepPick(object, ["a", "c"])

      // Assert
      expect(result).toEqual({ a: 1, c: 3 })
    })

    test("when given a nested object, it filters by object by suplied keys", () => {
      // Arrange
      const object = {
        a: 1,
        b: 2,
        c: {
          d: 4,
          f: 5,
        },
      }

      // Act
      const result = deepPick(object, ["a", { c: ["d"] }])

      // Assert
      expect(result).toEqual({ a: 1, c: { d: 4 } })
    })

    test("when given a deeply nested object, it filters by object by suplied keys", () => {
      // Arrange
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
          },
        ],
      }

      // Act
      const result = deepPick(object, ["a", { c: ["d"] }, { g: ["h"] }])

      // Assert
      expect(result).toEqual({ a: 1, c: { d: 4 }, g: [{ h: 6 }, { h: 8 }] })
    })

    test("when key refers to an object, returns an empty object", () => {
      // Arrange
      const object = {
        a: 1,
        b: 2,
        c: {
          d: 4,
          f: 5,
        },
      }

      // Act
      const result = deepPick(object, ["c"])

      // Assert
      expect(result).toEqual({ c: {} })
    })

    test("when key refers to an array of simple objects, returns an the array", () => {
      // Arrange
      const object = {
        a: 1,
        b: 2,
        c: [1, 2, 3],
      }

      // Act
      const result = deepPick(object, ["a", "c"])

      // Assert
      expect(result).toEqual({
        a: 1,
        c: [1, 2, 3],
      })
    })

    test("when key refers to an array of objects, returns an empty array", () => {
      // Arrange
      const object = {
        a: 1,
        b: 2,
        c: [
          {
            d: 4,
            f: 5,
          },
          {
            g: 6,
            h: 7,
          },
        ],
      }

      // Act
      const result = deepPick(object, ["a", "c"])

      // Assert
      expect(result).toEqual({
        a: 1,
        c: [],
      })
    })

    test("when key refers to a value that is null, returns null for that key", () => {
      // Arrange
      const object = {
        a: null,
        b: false,
        c: [],
        d: {},
        e: "",
      }

      // Act
      const result = deepPick(object, ["a", "b", "c", "d", "e"])

      // Assert
      expect(result).toEqual({
        a: null,
        b: false,
        c: [],
        d: {},
        e: "",
      })
    })

    test("when key refers to a value that is missing, does not add that key to the result", () => {
      // Arrange
      const object = {
        a: 1,
        b: 2,
      }

      // Act
      const result = deepPick(object, ["a", "b", "c"])

      // Assert
      expect(Object.keys(result)).toEqual(["a", "b"])
    })

    test("when key refers to a boolean value, returns the boolean value", () => {
      // Arrange
      const object = {
        a: true,
        b: false,
      }

      // Act
      const result = deepPick(object, ["a", "b"])

      // Assert
      expect(result).toEqual({ a: true, b: false })
    })

    test("when picking keys from an array of objects, returns the array object's picked by keys", () => {
      // Arrange
      const foo = [{ a: 1, b: 2, c: 3 }, { a: 11 }]

      // Act
      const result = deepPick(foo, ["a", "b"])

      // Assert
      expect(result).toEqual([{ a: 1, b: 2 }, { a: 11 }])
    })
  })
})
