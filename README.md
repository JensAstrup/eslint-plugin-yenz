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
5. Once all checks pass, prepare a release:

   ```bash
   yarn prepare version [--major|--minor|--patch|--premajor|--preminor|--prepatch|--prerelease]
   ```

   - Use one of the following flags to increment the version:
     - `--major`       auto-increment major version number
     - `--minor`       auto-increment minor version number
     - `--patch`       auto-increment patch version number
     - `--premajor`    auto-increment premajor version number
     - `--preminor`    auto-increment preminor version number
     - `--prepatch`    auto-increment prepatch version number
     - `--prerelease`  auto-increment prerelease version number

6. Merge your branch and publish as needed.

## License

ISC
