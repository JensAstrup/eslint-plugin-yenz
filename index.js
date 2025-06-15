const plugin = {
  rules: {
    'type-ordering': require('./lib/rules/type-ordering.js'),
    'no-loops': require('./lib/rules/no-loops.js'),
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
    },
  },
};

module.exports = plugin;
