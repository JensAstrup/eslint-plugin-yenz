# eslint-plugin-yenz

Adds custom rules that Jens likes

## Installation

```bash
yarn add eslint-plugin-yenz --dev
```

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
Ensures that null/undefined types are listed last in TypeScript union types.

### `yenz/no-loops`
Disallows certain loop types (allows for...of and for...in loops).

## Preset Configurations

- `recommended` - Enables type-ordering as error, no-loops as warning
- `

# Release Procedure

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
     yarn version --prerelease --preid alpha   # or beta, rc
     # Or for specific version bumps:
     yarn version --premajor --preid alpha    # 2.1.0-alpha.1 -> 3.0.0-alpha.0
     yarn version --preminor --preid beta     # 2.1.0-alpha.1 -> 2.2.0-beta.0
     yarn version --prepatch --preid rc       # 2.1.0-alpha.1 -> 2.1.1-rc.0
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
