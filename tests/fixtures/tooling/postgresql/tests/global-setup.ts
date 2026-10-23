import { rm, writeFile } from "node:fs/promises"

const markerPath = new URL("./global-setup.marker", import.meta.url)

export async function setup(): Promise<() => Promise<void>> {
  await writeFile(markerPath, "ready")
  process.env.FIXTURE_GLOBAL_SETUP = "ready"

  return async () => {
    await rm(markerPath, { force: true })
  }
}
