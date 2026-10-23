import { describe, expect, test } from "vitest"

import { add } from "@/feature"
import { fixtureMessage } from "@tests/support/message"

describe("shared Vitest tooling in a PostgreSQL host", () => {
  test("when running host tests, source aliases and lifecycle hooks remain active", () => {
    // Arrange
    const numbers = [2, 3]

    // Act
    const result = add(...numbers)

    // Assert
    expect(result).toBe(5)
    expect(fixtureMessage).toBe("postgres host")
    expect(process.env.FIXTURE_GLOBAL_SETUP).toBe("ready")
    expect(process.env.FIXTURE_TEST_HOOK).toBe("ready")
  })
})
