import { access } from "node:fs/promises"
import { beforeEach } from "vitest"

const markerPath = new URL("./global-setup.marker", import.meta.url)

beforeEach(async () => {
  await access(markerPath)
  process.env.FIXTURE_TEST_HOOK = "ready"
})
