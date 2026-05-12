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
 * Matches `export default function foo() {}`, `export default class Foo {}`, or
 * TypeScript `export default interface …` / `export default type …` when the
 * declaration is named. Anonymous `export default function () {}` is skipped
 * because there is no local binding to list in a trailing specifier export.
 *
 * @param {object} node - Top-level program statement node.
 * @returns {boolean}
 */
function isInlineDefaultExportableDeclaration(node) {
  if (node.type !== 'ExportDefaultDeclaration' || !node.declaration) {
    return false;
  }
  const { declaration } = node;
  if (!EXPORTABLE_DECLARATION_TYPES.has(declaration.type)) {
    return false;
  }
  return Boolean(declaration.id);
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
 * Reads named specifiers and an optional `… as default` from an existing
 * specifier-only export so they can be merged with new items.
 *
 * Handles both forms of type-only exports:
 *   - Statement-level: `export type { Foo, Bar }` → `exportNode.exportKind === 'type'`
 *   - Per-specifier:   `export { type Foo, bar }` → `specifier.exportKind === 'type'`
 *
 * @param {object} exportNode - An `ExportNamedDeclaration` with no
 *   `declaration` and no `source` (i.e. a bare `export { … }`).
 * @returns {{ namedItems: Array<{ name: string, isType: boolean }>, defaultLocalName: string | null }}
 */
function parseSpecifierOnlyExport(exportNode) {
  const namedItems = [];
  let defaultLocalName = null;
  for (const specifier of exportNode.specifiers) {
    if (specifier.type !== 'ExportSpecifier' || specifier.exported.type !== 'Identifier') {
      continue;
    }
    if (specifier.exported.name === 'default' && specifier.local.type === 'Identifier') {
      defaultLocalName = specifier.local.name;
      continue;
    }
    const isType =
      specifier.exportKind === 'type' ||
      (exportNode.exportKind === 'type' && !exportNode.declaration);
    namedItems.push({ name: specifier.exported.name, isType });
  }
  return { namedItems, defaultLocalName };
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
 * @param {string | null} existingDefault
 * @param {string | null} addedDefault
 * @returns {string | null}
 */
function mergeDefaultExportLocal(existingDefault, addedDefault) {
  if (addedDefault !== null) {
    return addedDefault;
  }
  return existingDefault;
}

/**
 * Renders named specifiers and an optional default as one export statement.
 * When every named item is type-only and there is no default, uses
 * `export type { … }`; otherwise uses `export { … }` with per-name `type`
 * markers where needed.
 *
 * @param {Array<{ name: string, isType: boolean }>} namedItems
 * @param {string | null} defaultLocalName - Local binding listed as `name as default`.
 * @returns {string} A single-line export statement (no trailing newline).
 */
function formatMergedSpecifierExport(namedItems, defaultLocalName) {
  const parts = namedItems.map((item) => (item.isType ? `type ${item.name}` : item.name));
  if (defaultLocalName !== null) {
    parts.push(`${defaultLocalName} as default`);
  }
  if (parts.length === 0) {
    return 'export {}';
  }
  const canUseExportTypeStatement =
    defaultLocalName === null && namedItems.length > 0 && namedItems.every((item) => item.isType);
  if (canUseExportTypeStatement) {
    return `export type { ${namedItems.map((item) => item.name).join(', ')} }`;
  }
  return `export { ${parts.join(', ')} }`;
}

/**
 * Returns a location that covers only the declaration header (through `(` or
 * `{` before the body, or through `=` for type aliases), not the whole block.
 *
 * @param {object} declaration - Function, class, interface, or type alias node.
 * @param {object} reportStart - `loc.start` of the export statement.
 * @param {object} endFallbackLoc - Full span if no tighter range applies.
 * @param {import('eslint').SourceCode} sourceCode
 * @returns {object} ESLint `SourceLocation` (`start` / `end` in line/column).
 */
function getDeclarationSignatureLoc(declaration, reportStart, endFallbackLoc, sourceCode) {
  const endsBeforeBraceBody =
    (declaration.type === 'FunctionDeclaration'
      || declaration.type === 'ClassDeclaration'
      || declaration.type === 'TSInterfaceDeclaration')
    && declaration.body;

  if (endsBeforeBraceBody) {
    const bodyOpenIndex = declaration.body.range[0];
    return {
      start: reportStart,
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
        start: reportStart,
        end: sourceCode.getLocFromIndex(equalsToken.range[0]),
      };
    }
  }

  return endFallbackLoc;
}

function getInlineExportReportLoc(exportNamedNode, sourceCode) {
  const declaration = exportNamedNode.declaration;
  const { start } = exportNamedNode.loc;
  return getDeclarationSignatureLoc(declaration, start, exportNamedNode.loc, sourceCode);
}

function getInlineDefaultExportReportLoc(exportDefaultNode, sourceCode) {
  const declaration = exportDefaultNode.declaration;
  const { start } = exportDefaultNode.loc;
  return getDeclarationSignatureLoc(declaration, start, exportDefaultNode.loc, sourceCode);
}

const exportAtEndOfFileRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow inline export (including default export) on function, class, type, or interface declarations; use export specifiers at the end of the file',
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
        const violations = programNode.body.filter(
          (statement) =>
            isInlineExportableDeclaration(statement)
            || isInlineDefaultExportableDeclaration(statement)
        );
        if (violations.length === 0) {
          return;
        }

        const addedExportItems = violations
          .filter((node) => node.type === 'ExportNamedDeclaration')
          .map(getExportItem);

        let addedDefaultLocal = null;
        for (const node of violations) {
          if (node.type === 'ExportDefaultDeclaration' && node.declaration?.id) {
            addedDefaultLocal = node.declaration.id.name;
          }
        }

        const lastViolation = violations[violations.length - 1];

        violations.forEach((node) => {
          const reportLoc =
            node.type === 'ExportDefaultDeclaration'
              ? getInlineDefaultExportReportLoc(node, sourceCode)
              : getInlineExportReportLoc(node, sourceCode);

          context.report({
            loc: reportLoc,
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
                      const { namedItems: existingNamed, defaultLocalName: existingDefault } =
                        parseSpecifierOnlyExport(existingExport);
                      const mergedNamed = mergeExportItems(existingNamed, addedExportItems);
                      const mergedDefault = mergeDefaultExportLocal(existingDefault, addedDefaultLocal);
                      edits.push(
                        fixer.replaceText(
                          existingExport,
                          formatMergedSpecifierExport(mergedNamed, mergedDefault)
                        )
                      );
                    } else {
                      const lastToken = sourceCode.getLastToken(programNode);
                      edits.push(
                        fixer.insertTextAfter(
                          lastToken,
                          `\n\n${formatMergedSpecifierExport(addedExportItems, addedDefaultLocal)}\n`
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
