function add(x: number, y: number) {
  return x + y
}

test('it should add', () => {
  expect(add(2, 2)).toBe(4)
  expect(add(2, 2)).not.toBe(5)
})
