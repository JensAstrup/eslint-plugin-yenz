import tseslint from 'typescript-eslint';
import plugin from '../index.js';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      yenz: plugin,
    },
    rules: {
      'yenz/type-ordering': 'error',
      'yenz/no-loops': 'error',
      'yenz/no-named-arrow-functions': 'error',
    },
  },
];
