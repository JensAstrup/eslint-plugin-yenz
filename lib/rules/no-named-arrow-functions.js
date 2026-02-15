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
            const replaceTarget = isExport ? parent : declaration;

            const asyncPrefix = arrow.async ? 'async ' : '';
            const params = arrow.params.map(p => sourceCode.getText(p)).join(', ');

            // Preserve TypeScript type parameters (generics)
            let typeParams = '';
            if (arrow.typeParameters) {
              typeParams = sourceCode.getText(arrow.typeParameters);
            }

            // Preserve TypeScript return type
            let returnType = '';
            if (arrow.returnType) {
              returnType = sourceCode.getText(arrow.returnType);
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
