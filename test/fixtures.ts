// === type-ordering ===
// Should flag:
type A = null | string
type B = undefined | number

// Should pass:
type C = string | null
type D = number | undefined

// === no-loops ===
// Should flag:
function loopTests() {
  for (let i = 0; i < 10; i++) { break }
  while (false) {}
  do {} while (false)

  // Should pass:
  const arr = [1, 2, 3]
  for (const x of arr) { console.log(x) }
  const obj = { a: 1 }
  for (const k in obj) { console.log(k) }
}

// === no-named-arrow-functions ===
// Should flag:
const foo = () => {}
const bar = (x: number) => x * 2
const baz = async () => {}
const typed: () => void = () => {}

// Should pass:
const arr2 = [1, 2, 3].map(x => x)
class MyClass {
  method = () => {}
}
const obj2 = {
  method: () => {}
}
