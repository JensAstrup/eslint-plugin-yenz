# eslint-plugin-yenz

Ensure specific types are listed before `null`/`undefined` in TypeScript type annotations.

## Installation

Install the plugin using npm:

```bash
npm install eslint-plugin-yenz --save-dev
```

## Usage

Add `yenz` to the plugins section of your `.eslintrc` configuration file. You can then configure the `type-ordering` rule under the rules section.

### .eslintrc

```json
{
  "plugins": ["yenz"],
  "rules": {
    "yenz/type-ordering": "error"
  }
}
```

## Rule Details

This rule ensures that `null` and `undefined` types are listed last in TypeScript union type annotations.

### Rule Configuration

```json
{
  "rules": {
    "yenz/type-ordering": ["error"]
  }
}
```

### Example

#### Incorrect

```typescript
let example: string | null | undefined;
let example: undefined | string | null;
```

#### Correct

```typescript
let example: string | undefined | null;
```

## Fixable

This rule is fixable. The fixer will automatically move `null` and `undefined` to the end of the union type.

## Contributing

If you want to contribute to this project, feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License.

---

This README now correctly describes the rule and provides accurate examples of incorrect and correct code.
