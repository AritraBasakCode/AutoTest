import assert from 'node:assert/strict'
import { createServer } from '../src/server.js'

const server = createServer()
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

try {
  const address = server.address()
  const response = await fetch(`http://127.0.0.1:${address.port}/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
  console.log('E2E smoke test passed: local HTTP app health endpoint')
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}
