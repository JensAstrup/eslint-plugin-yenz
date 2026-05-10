const EXPORTABLE_DECLARATION_TYPES = new Set([
  'FunctionDeclaration',
  'ClassDeclaration',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
]);

const TYPE_ONLY_DECLARATION_TYPES = new Set([
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
]);

function isInlineExportableDeclaration(node) {
  if (node.type !== 'ExportNamedDeclaration' || node.source || !node.declaration) {
    return false;
  }
  const { declaration } = node;
  return EXPORTABLE_DECLARATION_TYPES.has(declaration.type) && Boolean(declaration.id);
}

function getExportItem(exportNamedNode) {
  const { declaration } = exportNamedNode;
  return {
    name: declaration.id.name,
    isType: TYPE_ONLY_DECLARATION_TYPES.has(declaration.type),
  };
}

function getSpecifierOnlyExportItems(exportNode) {
  const items = [];
  for (const specifier of exportNode.specifiers) {
    if (specifier.type !== 'ExportSpecifier' || specifier.exported.type !== 'Identifier') {
      continue;
    }
    const isType =
      specifier.exportKind === 'type' ||
      (exportNode.exportKind === 'type' && !exportNode.declaration);
    items.push({ name: specifier.exported.name, isType });
  }
  return items;
}

function findSpecifierOnlyExport(programNode) {
  const results = programNode.body.find(statement => statement.type === 'ExportNamedDeclaration'
     && !statement.declaration && !statement.source && statement.specifiers.length > 0);
  return results || null;
}

function mergeExportItems(existingItems, addedItems) {
  const seen = new Set();
  const merged = [];
  for (const item of existingItems) {
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    merged.push(item);
  }
  for (const item of addedItems) {
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    merged.push(item);
  }
  return merged;
}

function formatMergedSpecifierExport(items) {
  if (items.length === 0) {
    return 'export {}';
  }
  if (items.every((item) => item.isType)) {
    return `export type { ${items.map((item) => item.name).join(', ')} }`;
  }
  return `export { ${items
    .map((item) => (item.isType ? `type ${item.name}` : item.name))
    .join(', ')} }`;
}

const exportAtEndOfFileRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow inline export on function, class, type, or interface declarations; use a single export list at the end of the file',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    const { sourceCode } = context;

    return {
      'Program:exit'(programNode) {
        const violations = programNode.body.filter(isInlineExportableDeclaration);
        if (violations.length === 0) {
          return;
        }

        const addedExportItems = violations.map(getExportItem);
        const lastViolation = violations[violations.length - 1];

        violations.forEach((node) => {
          context.report({
            node,
            message:
              'Declare this without inline export and list it in a single export statement at the end of the file.',
            ...(node === lastViolation
              ? {
                  fix(fixer) {
                    const edits = violations.map((exportNode) =>
                      fixer.replaceText(exportNode, sourceCode.getText(exportNode.declaration))
                    );

                    const existingExport = findSpecifierOnlyExport(programNode);
                    if (existingExport) {
                      const merged = mergeExportItems(
                        getSpecifierOnlyExportItems(existingExport),
                        addedExportItems
                      );
                      edits.push(
                        fixer.replaceText(existingExport, formatMergedSpecifierExport(merged))
                      );
                    } else {
                      const lastToken = sourceCode.getLastToken(programNode);
                      edits.push(
                        fixer.insertTextAfter(
                          lastToken,
                          `\n\n${formatMergedSpecifierExport(addedExportItems)}`
                        )
                      );
                    }

                    return edits;
                  },
                }
              : {}),
          });
        }
      },
    };
  },
};

export default exportAtEndOfFileRule;
