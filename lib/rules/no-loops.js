// Taken from https://github.com/buildo/eslint-plugin-no-loops?tab=readme-ov-file
// Allows the use of `for const x of y` and `for const x in y`

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow certain loop types (allows for...of and for...in)',
      recommended: false,
    },
    fixable: null,
    schema: [],
  },
  create(context) {
    function reportLoopPresence(node) {
      context.report({
        node,
        message: 'loops are not allowed',
      });
    }

    return {
      ForStatement: reportLoopPresence,
      WhileStatement: reportLoopPresence,
      DoWhileStatement: reportLoopPresence,
    };
  },
};
