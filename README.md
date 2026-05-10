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

> **Note:** This rule is *not* enabled in the `recommended` preset. Enable it explicitly or use the `all` preset.

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

> **Note:** This rule is *not* enabled in the `recommended` preset. Enable it explicitly or use the `all` preset.

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

- `**recommended**` - Enables `type-ordering` as error and `no-loops` as warning
- `**all**` - Enables `type-ordering`, `no-loops`, and `no-named-arrow-functions` as errors

# Release Procedure

1. Open a new branch for your work.
2. Make all changes in that branch.
3. Run `yarn lint` and resolve any errors.
4. Add code samples in `test/` that intentionally fail your new or updated rules to confirm they are caught.
5. Commit and push your changes, then open a PR.
6. **Bump to a pre-release version and publish a beta:**

  ```bash
   yarn version --pre[major|minor|patch] --preid beta
   npm publish --tag beta                # or alpha, rc
  ```

   Users can test it with:
7. After review, **merge your branch into `main`**.
8. Open a version bump PR against `main` and merge it in.
9. **Publish the stable release** from `main`:

  ```bash
   yarn version --[major|minor|patch]
   npm publish
  ```

> **Why `yarn version` + `npm publish`?** `yarn version` handles the version bump, git tag, and commit. We use `npm publish` for the actual publish because `yarn publish` redundantly prompts for a new version even when one was already set.

# Development
- Use https://astexplorer.net/ to easily get the AST types for your changes

## Adding tests

Tests are fixture-based. All test cases live in a single file, `test/fixtures.ts`, and the runner (`test/run.js`) lints that file with ESLint, parses the JSON output, and compares it against inline annotations.

### Annotations

Each line in `test/fixtures.ts` may carry one or both of the following trailing comments:

- `// expect-error <ruleId>` — the line must produce a violation reported by `<ruleId>` (e.g. `yenz/no-loops`).
- `// fix: <expected-code>` — after running ESLint with `--fix-dry-run`, the line (with the `// expect-error ...` annotation stripped) must equal `<expected-code>`.

Lines without `// expect-error` must produce **no** violations. Unexpected violations fail the test, just like missing ones.

### Adding a positive case (rule should fire)

Add a line that violates the rule and annotate it:

```typescript
const foo = () => {} // expect-error yenz/no-named-arrow-functions
```

If the rule is auto-fixable, also include the expected fixed output:

```typescript
const foo = () => {} // expect-error yenz/no-named-arrow-functions // fix: function foo() {}
```

### Adding a negative case (rule should not fire)

Add the code with no annotation. A short `// Should pass:` comment above the block keeps the file readable:

```typescript
// Should pass:
const arr = [1, 2, 3].map(x => x)
```

### Running tests

```bash
yarn test
```

The runner reports `Violations: X/Y passed` and `Fixes: X/Y passed`, and exits non-zero on any missing violation, unexpected violation, or fix mismatch.
