export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow arrow functions assigned to named variables (prefer function declarations)',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (
          // node.id.type !== 'Identifier': ensure only simple assignments like "const foo = ...", not destructuring.
          // For example, "const foo = ..." => Identifier; "const { x } = ..." => ObjectPattern; "const [a] = ..." => ArrayPattern.
          node.id.type !== 'Identifier' ||
          !node.init ||
          node.init.type !== 'ArrowFunctionExpression'
        ) {
          return;
        }

        const name = node.id.name;
        const arrow = node.init;
        const sourceCode = context.sourceCode || context.getSourceCode();

        context.report({
          node: arrow,
          message: "Prefer a function declaration over an arrow function assigned to '{{name}}'.",
          data: { name },
          fix(fixer) {
            const declaration = node.parent;

            // Bail out if there are multiple declarators: const a = () => {}, b = 1
            if (declaration.declarations.length > 1) {
              return null;
            }

            const parent = declaration.parent;
            const isExport = parent && parent.type === 'ExportNamedDeclaration';
            const exportPrefix = isExport ? 'export ' : '';
            // When exported (e.g. export const foo = () => {}), replace the whole ExportNamedDeclaration;
            // otherwise replace only the VariableDeclaration.
            const replaceTarget = isExport ? parent : declaration;

            const asyncPrefix = arrow.async ? 'async ' : '';
            const params = arrow.params.map(p => sourceCode.getText(p)).join(', ');

            // Preserve TypeScript type parameters
            let typeParams = '';
            if (arrow.typeParameters) {
              typeParams = sourceCode.getText(arrow.typeParameters);
            }

            // Preserve TypeScript return type
            let returnType = '';
            if (arrow.returnType) {
              returnType = sourceCode.getText(arrow.returnType);
            } else if (node.id.typeAnnotation) {
              returnType = sourceCode.getText(node.id.typeAnnotation);
            }

            let body;
            if (arrow.body.type === 'BlockStatement') {
              body = sourceCode.getText(arrow.body);
            } else {
              // Expression body: wrap in { return expr; }
              body = `{ return ${sourceCode.getText(arrow.body)}; }`;
            }

            const functionDeclaration = `${exportPrefix}${asyncPrefix}function ${name}${typeParams}(${params})${returnType} ${body}`;

            return fixer.replaceText(replaceTarget, functionDeclaration);
          },
        });
      },
    };
  },
};
