import { app } from "@example-app/app.js"

const port = Number(process.env.API_PORT ?? 3000)
app.listen(port, () => {
  console.log(`Express Light Rail example listening on port ${port}`)
})
