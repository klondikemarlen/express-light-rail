import http from "http"

import { API_PORT } from "@/config"
import app from "@/app"

export const server = http.createServer(app)

server.listen(API_PORT, () => {
  console.log(`Express Light Rail API listenting on port ${API_PORT}`)
})
