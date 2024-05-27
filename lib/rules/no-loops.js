// Taken from https://github.com/buildo/eslint-plugin-no-loops?tab=readme-ov-file
// Allows the use of `for const x of y` and `for const x in y`
'use strict';

module.exports = function (context) {
  function reportLoopPresence(node) {
    context.report(node, 'loops are not allowed', { identifier: node.name });
  }

  return {
    ForStatement: reportLoopPresence,
    WhileStatement: reportLoopPresence,
    DoWhileStatement: reportLoopPresence,
  };
};
