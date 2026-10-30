import assert from 'node:assert/strict'
import test from 'node:test'
import { add, divide } from '../src/calculator.js'

test('adds two values', () => {
  assert.equal(add(2, 3), 5)
})

test('divides two values', () => {
  assert.equal(divide(12, 3), 4)
})

test('rejects division by zero', () => {
  assert.throws(() => divide(1, 0), /Cannot divide by zero/)
})
