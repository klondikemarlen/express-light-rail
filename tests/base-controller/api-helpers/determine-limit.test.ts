import { determineLimit } from "@/base-controller/api-helpers/index.js"

describe("tests/base-controller/api-helpers/determine-limit.test.ts", () => {
  describe("determineLimit", () => {
    test("returns MAX_PER_PAGE for -1", () => {
      expect(determineLimit(-1)).toBe(1000)
    })

    test("caps at MAX_PER_PAGE", () => {
      expect(determineLimit(5000)).toBe(1000)
    })

    test("floors at 1", () => {
      expect(determineLimit(0)).toBe(1)
    })
  })
})
