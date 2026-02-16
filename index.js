import typeOrdering from './lib/rules/type-ordering.js';
import noLoops from './lib/rules/no-loops.js';
import noNamedArrowFunctions from './lib/rules/no-named-arrow-functions.js';

const plugin = {
  rules: {
    'type-ordering': typeOrdering,
    'no-loops': noLoops,
    'no-named-arrow-functions': noNamedArrowFunctions,
  },
};

// For flat config compatibility
plugin.configs = {
  recommended: {
    plugins: {
      yenz: plugin,
    },
    rules: {
      'yenz/type-ordering': 'error',
      'yenz/no-loops': 'warn',
    },
  },
  all: {
    plugins: {
      yenz: plugin,
    },
    rules: {
      'yenz/type-ordering': 'error',
      'yenz/no-loops': 'error',
      'yenz/no-named-arrow-functions': 'error',
    },
  },
};

export default plugin;
