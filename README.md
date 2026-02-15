# eslint-plugin-yenz

Adds custom rules that Jens likes

## Installation

```bash
yarn add eslint-plugin-yenz typescript-eslint --dev
```

`typescript-eslint` is required for the `type-ordering` rule (it provides the TypeScript parser that understands union type syntax).

## Usage

### Flat Config (ESLint 8.21.0+)

```javascript
// eslint.config.js
import yenz from 'eslint-plugin-yenz';

export default [
  {
    plugins: {
      yenz,
    },
    rules: {
      'yenz/type-ordering': 'error',
      'yenz/no-loops': 'warn',
    },
  },
  // Or use the recommended config
  yenz.configs.recommended,
];
```

### Legacy Config (.eslintrc)

```json
{
  "plugins": ["yenz"],
  "rules": {
    "yenz/type-ordering": "error",
    "yenz/no-loops": "warn"
  }
}
```

## Rules

### `yenz/type-ordering`

Ensures that `null`/`undefined` types are listed last in TypeScript union types. Auto-fixable.

Requires `typescript-eslint` parser to work (see [Installation](#installation)).

**Bad:**
```typescript
type A = null | string
type B = undefined | number
type C = null | undefined | string | number
```

**Good:**
```typescript
type A = string | null
type B = number | undefined
type C = string | number | null | undefined
```

### `yenz/no-loops`

Disallows `for`, `while`, and `do...while` loops. `for...of` and `for...in` are allowed.

> **Note:** This rule is _not_ enabled in the `recommended` preset. Enable it explicitly or use the `all` preset.

**Bad:**
```javascript
for (let i = 0; i < items.length; i++) { /* ... */ }
while (condition) { /* ... */ }
do { /* ... */ } while (condition)
```

**Good:**
```javascript
for (const item of items) { /* ... */ }
for (const key in obj) { /* ... */ }
items.forEach(item => { /* ... */ })
items.map(item => transform(item))
```

### `yenz/no-named-arrow-functions`

Disallows arrow functions assigned to named variables. Prefer function declarations instead. Auto-fixable.

> **Note:** This rule is _not_ enabled in the `recommended` preset. Enable it explicitly or use the `all` preset.

**Bad:**
```javascript
const foo = () => {};
const bar = (x) => { return x + 1; };
const baz = async () => { await fetch(); };
export const qux = () => {};
```

**Good:**
```javascript
function foo() {}
function bar(x) { return x + 1; }
async function baz() { await fetch(); }
export function qux() {}

// These are fine — anonymous/inline arrows are not flagged:
arr.map(x => x.id);
arr.filter((item) => item.active);
class Foo { bar = () => {} }
```

## Preset Configurations

- **`recommended`** — Enables `type-ordering` as error and `no-loops` as warning
- **`all`** — Enables all rules (`type-ordering`, `no-loops`, `no-named-arrow-functions`) as errors

# Release Procedure

1. Open a new branch for your work.
2. Make all changes in that branch.
3. Run `yarn lint` and resolve any errors.
4. Add code samples in `test/` that intentionally fail your new or updated rules to confirm they are caught.
5. Commit and push your changes, then open a PR.
6. **Bump to a pre-release version and publish a beta:**
   ```bash
   yarn version --prerelease --preid beta   # or alpha, rc
   yarn publish --tag beta                  # or alpha, rc
   ```
   Users can test it with:
   ```bash
   yarn add eslint-plugin-yenz@beta   # or @alpha, @rc
   ```
7. After review, **merge your branch into `main`**.
8. **Publish the stable release** from `main`:
   ```bash
   yarn version --major   # or --minor or --patch
   yarn publish
   ```
