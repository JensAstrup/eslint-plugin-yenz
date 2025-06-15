# eslint-plugin-yenz

Adds custom ESLint rules that Jens likes.

## Installation

```bash
yarn add --dev eslint-plugin-yenz
```

## Rules

- `yenz/type-ordering` - Ensures null/undefined types come last in union types (with auto-fix)
- `yenz/no-loops` - Disallows certain loop types (allows for...of and for...in)

## Configuration

### Flat Config (ESLint v9.0.0+)

```javascript
// eslint.config.js
import yenzPlugin from 'eslint-plugin-yenz';

export default [
  {
    plugins: {
      yenz: yenzPlugin,
    },
    rules: {
      'yenz/type-ordering': 'error',
      'yenz/no-loops': 'warn',
    },
  },
  // Or use a preset configuration
  yenzPlugin.configs.recommended,
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

## Preset Configurations

- `recommended` - Enables type-ordering as error, no-loops as warning
- `all` - Enables all rules as errors

## Development

When developing new rules or updating existing ones, ensure that you have code samples that both pass and fail the rules. This helps verify that your rules are effective and catch the intended patterns.

- Add or update test files that cover all cases for your rule (both valid and invalid code).
- Run the linter against these files to confirm that violations are detected and auto-fixes work as expected.
- Keep tests and example code up to date with any rule changes.

## Release Procedure

1. Open a new branch for your work.
2. Make all changes in that branch.
3. Run `yarn lint` and resolve any errors.
4. Add code samples that intentionally fail your new or updated rules to confirm they are caught.
5. **Bump the version:**
   - For stable releases:
     ```bash
     yarn version --major   # or --minor or --patch
     ```
   - For pre-releases (alpha, beta, rc):
     ```bash
     yarn version --prerelease --preid beta   # or alpha
     # Or for premajor, preminor, prepatch: 
     yarn version --premajor --preid alpha
     yarn version --preminor --preid beta
     yarn version --prepatch --preid rc
     ```
   - Commit and push your changes, then open a PR.
6. After review, **merge your branch into `main`**.
7. **Publish the package:**
   - On the `main` branch, pull the latest changes and run:
     - For stable releases:
       ```bash
       yarn publish --non-interactive --access public
       ```
     - For pre-releases (alpha, beta, rc):
       ```bash
       yarn publish --tag beta --non-interactive --access public   # or alpha, rc
       ```
   - This will publish the version already set in `package.json`.
   - _Do not run `yarn publish` before merging to `main`._
8. Users can install pre-releases with:
   ```bash
   yarn add eslint-plugin-yenz@beta   # or @alpha, @rc
   ```
9. Tag the release in git if desired.
