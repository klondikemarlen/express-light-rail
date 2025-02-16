import http from "http"

import { API_PORT } from "@example-app/config.js"
import app from "@example-app/app.js"

export const server = http.createServer(app)

server.listen(API_PORT, () => {
  console.log(`Express Light Rail API listenting on port ${API_PORT}`)
})
