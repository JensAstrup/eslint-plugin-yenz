function getExportedNamesFromDeclaration(declaration) {
  if (declaration.type === 'FunctionDeclaration') {
    return declaration.id ? [declaration.id.name] : [];
  }
  if (declaration.type === 'ClassDeclaration') {
    return declaration.id ? [declaration.id.name] : [];
  }
  if (declaration.type === 'TSTypeAliasDeclaration') {
    return declaration.id ? [declaration.id.name] : [];
  }
  if (declaration.type === 'TSInterfaceDeclaration') {
    return declaration.id ? [declaration.id.name] : [];
  }
  return [];
}

function isTypeOnlyDeclaration(declaration) {
  return (
    declaration.type === 'TSTypeAliasDeclaration' ||
    declaration.type === 'TSInterfaceDeclaration'
  );
}

function isSpecifierExportTypeOnly(specifier, parentExportNode) {
  if (specifier.exportKind === 'type' || specifier.importKind === 'type') {
    return true;
  }
  if (
    parentExportNode.exportKind === 'type' &&
    !parentExportNode.declaration
  ) {
    return true;
  }
  return false;
}

function isInlineExportableDeclaration(node) {
  if (node.type !== 'ExportNamedDeclaration') {
    return false;
  }
  if (!node.declaration || node.source) {
    return false;
  }
  const { declaration } = node;
  if (declaration.type === 'FunctionDeclaration') {
    return Boolean(declaration.id);
  }
  if (declaration.type === 'ClassDeclaration') {
    return Boolean(declaration.id);
  }
  if (declaration.type === 'TSTypeAliasDeclaration') {
    return Boolean(declaration.id);
  }
  if (declaration.type === 'TSInterfaceDeclaration') {
    return Boolean(declaration.id);
  }
  return false;
}

function getViolationExportItems(exportNamedNode) {
  const declaration = exportNamedNode.declaration;
  const names = getExportedNamesFromDeclaration(declaration);
  const isType = isTypeOnlyDeclaration(declaration);
  return names.map((name) => ({ name, isType }));
}

function parseSpecifierOnlyExportItems(exportNode) {
  if (exportNode.declaration || exportNode.source) {
    return null;
  }
  if (exportNode.specifiers.length === 0) {
    return null;
  }
  const items = [];
  for (const specifier of exportNode.specifiers) {
    if (specifier.type !== 'ExportSpecifier') {
      continue;
    }
    if (specifier.exported.type !== 'Identifier') {
      continue;
    }
    items.push({
      name: specifier.exported.name,
      isType: isSpecifierExportTypeOnly(specifier, exportNode),
    });
  }
  return items.length > 0 ? items : null;
}

function findTrailingSpecifierOnlyExport(programNode) {
  for (statement of programNode.body) {
    if (statement.type !== 'ExportNamedDeclaration') {
      continue;
    }
    if (statement.declaration || statement.source) {
      continue;
    }
    if (statement.specifiers.length === 0) {
      continue;
    }
    return statement;
  }
  return null;
}

function mergeExportItems(existingItems, addedItems) {
  const seen = new Set();
  const merged = [];
  for (const item of [...existingItems, ...addedItems]) {
    if (seen.has(item.name)) {
      continue;
    }
    seen.add(item.name);
    merged.push(item);
  }
  return merged;
}

function formatMergedSpecifierExport(items) {
  if (items.length === 0) {
    return 'export {}';
  }
  const allType = items.every((item) => item.isType);
  if (allType) {
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
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      'Program:exit'(programNode) {
        const violations = programNode.body.filter(isInlineExportableDeclaration);

        if (violations.length === 0) {
          return;
        }

        const addedExportItems = violations.flatMap(getViolationExportItems);

        violations.forEach((node, index) => {
          const isLast = index === violations.length - 1;

          context.report({
            node,
            message:
              'Declare this without inline export and list it in a single export statement at the end of the file.',
            ...(isLast
              ? {
                  fix(fixer) {
                    const edits = violations.map((exportNode) =>
                      fixer.replaceText(
                        exportNode,
                        sourceCode.getText(exportNode.declaration)
                      )
                    );

                    const trailingSpecifierExport = findTrailingSpecifierOnlyExport(programNode);
                    const canMergeIntoTrailing = trailingSpecifierExport && !violations.includes(trailingSpecifierExport);
                    if (canMergeIntoTrailing) {
                      const existingItems = parseSpecifierOnlyExportItems(trailingSpecifierExport);
                      const mergedItems = mergeExportItems(existingItems, addedExportItems);
                      edits.push(
                        fixer.replaceText(
                          trailingSpecifierExport,
                          formatMergedSpecifierExport(mergedItems)
                        )
                      );
                    } else {
                      const lastProgramToken =
                        sourceCode.getLastToken(programNode);
                      const exportLine = `\n\n${formatMergedSpecifierExport(addedExportItems)}`;
                      edits.push(
                        fixer.insertTextAfter(lastProgramToken, exportLine)
                      );
                    }

                    return edits;
                  },
                }
              : {}),
          });
        });
      },
    };
  },
};

export default exportAtEndOfFileRule;
