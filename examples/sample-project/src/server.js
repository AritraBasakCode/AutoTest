import { createServer as makeServer } from 'node:http'

export function createServer() {
  return makeServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ status: 'ok' }))
      return
    }
    response.writeHead(404)
    response.end()
  })
}
