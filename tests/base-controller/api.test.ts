import API from "@/base-controller/api"

describe("src/base-controller/api.ts", () => {
  describe("API", () => {
    describe(".index", () => {
      test("when called, executes the index action", async () => {
        const api = new API()
        await api.index()
      })
    })
  })
})
