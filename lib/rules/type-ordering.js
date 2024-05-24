module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure specific types are listed before null/undefined in type annotations',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    return {
      TSUnionType(node) {
        const nullUndefinedTypes = node.types.filter(
          (type) =>
            type.type === 'TSNullKeyword' ||
            type.type === 'TSUndefinedKeyword'
        )

        if (nullUndefinedTypes.length > 0) {
          const lastType = node.types[node.types.length - 1]

          if (
            lastType.type !== 'TSNullKeyword' &&
            lastType.type !== 'TSUndefinedKeyword'
          ) {
            context.report({
              node,
              message: 'Null/undefined types should be last in the union type.',
              fix(fixer) {
                const sortedTypes = [
                  ...node.types.filter(
                    (type) =>
                      type.type !== 'TSNullKeyword' &&
                      type.type !== 'TSUndefinedKeyword'
                  ),
                  ...nullUndefinedTypes,
                ]

                const sourceCode = context.getSourceCode()
                const typeText = sortedTypes
                  .map((type) => sourceCode.getText(type))
                  .join(' | ')

                return fixer.replaceText(node, typeText)
              },
            })
          }
        }
      },
    }
  },
}
