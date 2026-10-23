import { describe, expect, test } from "vitest"

import { multiply } from "@/feature"
import { fixtureMessage } from "@tests/support/message"

describe("shared Vitest tooling in a T-SQL host", () => {
  test("when running host tests, source aliases and lifecycle hooks remain active", () => {
    // Arrange
    const numbers = [4, 5]

    // Act
    const result = multiply(...numbers)

    // Assert
    expect(result).toBe(20)
    expect(fixtureMessage).toBe("T-SQL host")
    expect(process.env.FIXTURE_GLOBAL_SETUP).toBe("ready")
    expect(process.env.FIXTURE_TEST_HOOK).toBe("ready")
  })
})
