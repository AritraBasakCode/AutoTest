export function add(left, right) {
  return left + right
}

export function divide(left, right) {
  if (right === 0) throw new Error('Cannot divide by zero')
  return left / right
}
