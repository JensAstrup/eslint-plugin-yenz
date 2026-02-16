// === type-ordering ===
type A = null | string // expect-error yenz/type-ordering // fix: type A = string | null
type B = undefined | number // expect-error yenz/type-ordering // fix: type B = number | undefined

// Should pass:
type C = string | null
type D = number | undefined

// === no-loops ===
function loopTests() {
  for (let i = 0; i < 10; i++) { break } // expect-error yenz/no-loops
  while (false) {} // expect-error yenz/no-loops
  do {} while (false) // expect-error yenz/no-loops

  // Should pass:
  const arr = [1, 2, 3]
  for (const x of arr) { console.log(x) }
  const obj = { a: 1 }
  for (const k in obj) { console.log(k) }
}

// === no-named-arrow-functions ===
const foo = () => {} // expect-error yenz/no-named-arrow-functions // fix: function foo() {}
const bar = (x: number) => x * 2 // expect-error yenz/no-named-arrow-functions // fix: function bar(x: number) { return x * 2; }
const baz = async () => {} // expect-error yenz/no-named-arrow-functions // fix: async function baz() {}
const typed: () => void = () => {} // expect-error yenz/no-named-arrow-functions // fix: function typed(): () => void {}
const generic = <T>(x: T) => x // expect-error yenz/no-named-arrow-functions // fix: function generic<T>(x: T) { return x; }
const typedReturn = (x: number): number => x // expect-error yenz/no-named-arrow-functions // fix: function typedReturn(x: number): number { return x; }
const asyncWithParams = async (x: number) => x // expect-error yenz/no-named-arrow-functions // fix: async function asyncWithParams(x: number) { return x; }
let lv = () => {} // expect-error yenz/no-named-arrow-functions // fix: function lv() {}
var vv = () => {} // expect-error yenz/no-named-arrow-functions // fix: function vv() {}
export const exported = () => {} // expect-error yenz/no-named-arrow-functions // fix: export function exported() {}

// Should pass:
const arr2 = [1, 2, 3].map(x => x)
class MyClass {
  method = () => {}
}
const obj2 = {
  method: () => {}
}
