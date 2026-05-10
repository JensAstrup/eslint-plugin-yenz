// AST node types we treat as "exportable declarations" — i.e. things you can
// inline-export with `export function`, `export class`, `export type`, or
// `export interface`. The `TS*` types come from typescript-eslint and only
// appear when the file is parsed with the TS parser.
const EXPORTABLE_DECLARATION_TYPES = new Set([
  'FunctionDeclaration',
  'ClassDeclaration',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
]);

// Subset of the above that exists only at the type level. When listed at the
// bottom of the file these need either `export type { … }` or per-name
// `type` markers so tools like `verbatimModuleSyntax` keep them erased.
const TYPE_ONLY_DECLARATION_TYPES = new Set([
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
]);

/**
 * Determines whether an AST node is an inline-exported declaration that this
 * rule should flag. Matches statements like `export function foo() {}` or
 * `export type Foo = …`, but ignores re-exports (`export { x } from '…'`)
 * and bare specifier exports (`export { x }`).
 *
 * @param {object} node - Top-level program statement node.
 * @returns {boolean} True when the node is an inline `export <decl>` form
 *   covering function, class, type alias, or interface declarations.
 */
function isInlineExportableDeclaration(node) {
  // `node.source` is non-null for re-exports (`export { x } from '…'`) and
  // `node.declaration` is null for bare specifier exports (`export { x }`).
  if (node.type !== 'ExportNamedDeclaration' || node.source || !node.declaration) {
    return false;
  }
  const { declaration } = node;
  // `declaration.id` is null for anonymous default-export-style declarations,
  // which don't apply here but we guard against it for safety.
  return EXPORTABLE_DECLARATION_TYPES.has(declaration.type) && Boolean(declaration.id);
}

/**
 * Extracts the exported name (and whether it's type-only) from an inline
 * export declaration so it can be appended to the consolidated export list.
 *
 * @param {object} exportNamedNode - An `ExportNamedDeclaration` node that
 *   has already been validated by {@link isInlineExportableDeclaration}.
 * @returns {{ name: string, isType: boolean }} Export item describing the
 *   declared identifier and whether it should be marked `type` in the final
 *   export statement.
 */
function getExportItem(exportNamedNode) {
  const { declaration } = exportNamedNode;
  return {
    name: declaration.id.name,
    isType: TYPE_ONLY_DECLARATION_TYPES.has(declaration.type),
  };
}

/**
 * Reads the items from an existing specifier-only export statement so they
 * can be merged with the items we are about to append.
 *
 * Handles both forms of type-only exports:
 *   - Statement-level: `export type { Foo, Bar }` → `exportNode.exportKind === 'type'`
 *   - Per-specifier:   `export { type Foo, bar }` → `specifier.exportKind === 'type'`
 *
 * @param {object} exportNode - An `ExportNamedDeclaration` with no
 *   `declaration` and no `source` (i.e. a bare `export { … }`).
 * @returns {Array<{ name: string, isType: boolean }>} The specifier list
 *   normalized into the same shape returned by {@link getExportItem}.
 */
function getSpecifierOnlyExportItems(exportNode) {
  const items = [];
  for (const specifier of exportNode.specifiers) {
    // Skip `export { x as default }` (handled by ExportSpecifier with non-Identifier
    // exported, e.g. StringLiteral) and any non-ExportSpecifier nodes a parser
    // might produce.
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

/**
 * Locates an existing bare `export { … }` / `export type { … }` statement at
 * the program level so the autofix can merge new names into it instead of
 * appending a second export block.
 *
 * @param {object} programNode - The top-level `Program` AST node.
 * @returns {object | null} The matching `ExportNamedDeclaration`, or null
 *   when no specifier-only export exists.
 */
function findSpecifierOnlyExport(programNode) {
  const results = programNode.body.find(statement => statement.type === 'ExportNamedDeclaration'
     && !statement.declaration && !statement.source && statement.specifiers.length > 0);
  return results || null;
}

/**
 * Combines existing export items with newly added ones, preserving order and
 * dropping duplicates by name (existing wins, so an existing `type` marker
 * isn't accidentally downgraded to a value export).
 *
 * @param {Array<{ name: string, isType: boolean }>} existingItems
 * @param {Array<{ name: string, isType: boolean }>} addedItems
 * @returns {Array<{ name: string, isType: boolean }>} Deduplicated, ordered
 *   list of export items.
 */
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

/**
 * Renders a list of export items as a single `export { … }` statement. When
 * every item is type-only the output uses the statement-level `export type
 * { … }` form; otherwise mixed lists use per-name `type` markers so type
 * symbols stay erasable under `verbatimModuleSyntax`/isolated modules.
 *
 * @param {Array<{ name: string, isType: boolean }>} items
 * @returns {string} A single-line export statement (no trailing newline).
 */
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

/**
 * Returns a location that covers only the exported header (for example
 * `export function foo()` through the closing `)`), not the whole declaration
 * body, so editors underline the signature instead of the entire block.
 *
 * @param {object} exportNamedNode - Inline `ExportNamedDeclaration`.
 * @param {import('eslint').SourceCode} sourceCode
 * @returns {object} ESLint `SourceLocation` (`start` / `end` in line/column).
 */
function getInlineExportReportLoc(exportNamedNode, sourceCode) {
  const declaration = exportNamedNode.declaration;
  const { start } = exportNamedNode.loc;

  const endsBeforeBraceBody =
    (declaration.type === 'FunctionDeclaration'
      || declaration.type === 'ClassDeclaration'
      || declaration.type === 'TSInterfaceDeclaration')
    && declaration.body;

  if (endsBeforeBraceBody) {
    const bodyOpenIndex = declaration.body.range[0];
    return {
      start,
      end: sourceCode.getLocFromIndex(bodyOpenIndex),
    };
  }

  if (declaration.type === 'TSTypeAliasDeclaration') {
    const anchor = declaration.typeParameters ?? declaration.id;
    const equalsToken = sourceCode.getTokenAfter(anchor, {
      filter: (token) => token.type === 'Punctuator' && token.value === '=',
    });
    if (equalsToken) {
      return {
        start,
        end: sourceCode.getLocFromIndex(equalsToken.range[0]),
      };
    }
  }

  return exportNamedNode.loc;
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
      // Use `Program:exit` so we have the full body before deciding whether to
      // merge into an existing trailing `export { … }`. We also attach the
      // single, file-spanning autofix to the *last* violation only - ESLint
      // applies fixes in document order, and reporting the same set of edits
      // from every violation would race and produce overlapping fixes.
      'Program:exit'(programNode) {
        const violations = programNode.body.filter(isInlineExportableDeclaration);
        if (violations.length === 0) {
          return;
        }

        const addedExportItems = violations.map(getExportItem);
        const lastViolation = violations[violations.length - 1];

        violations.forEach((node) => {
          context.report({
            loc: getInlineExportReportLoc(node, sourceCode),
            message:
              'Declare this without inline export and list it in a single export statement at the end of the file.',
            ...(node === lastViolation
              ? {
                  fix(fixer) {
                    // Strip the leading `export` from each violation by
                    // replacing the whole `ExportNamedDeclaration` node with
                    // the source text of its inner declaration.
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
                      // No bare export to merge into - append a fresh one
                      // after the program's last token. Ends with a newline to follow
                      // best practices.
                      const lastToken = sourceCode.getLastToken(programNode);
                      edits.push(
                        fixer.insertTextAfter(
                          lastToken,
                          `\n\n${formatMergedSpecifierExport(addedExportItems)}\n`
                        )
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
