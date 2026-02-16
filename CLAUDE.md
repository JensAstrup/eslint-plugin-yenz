# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ESLint plugin (`eslint-plugin-yenz`) providing three custom rules: `type-ordering`, `no-loops`, and `no-named-arrow-functions`. ES module format, zero runtime dependencies. Uses flat config (ESLint 8.21+).

## Commands

- **Install dependencies:** `yarn install`
- **Run tests:** `yarn test` (runs `node test/run.js`)

There is no build step - source files are used directly.

## Architecture

### Plugin Entry Point

`index.js` aggregates all rules from `lib/rules/` and defines two preset configs (`recommended` and `all`).

### Rules (`lib/rules/`)

Each rule module exports a default object with `meta` (metadata) and `create(context)` (returns AST node listeners). Rules use `context.report()` for violations and `context.sourceCode` for text manipulation.

- **type-ordering** - Ensures `null`/`undefined` appear last in TypeScript union types. Auto-fixable. Listens to `TSUnionType`.
- **no-loops** - Disallows `for`, `while`, `do...while` (allows `for...of` and `for...in`). Not fixable. Listens to `ForStatement`, `WhileStatement`, `DoWhileStatement`.
- **no-named-arrow-functions** - Disallows arrow functions assigned to named variables; prefers function declarations. Auto-fixable. Listens to `VariableDeclarator`.

### Testing

Fixture-based: `test/fixtures.ts` contains code that should trigger (or not trigger) violations. The test runner (`test/run.js`) invokes ESLint CLI on the fixtures, parses JSON output, and compares expected vs actual violations by line number and rule ID. Test ESLint config is at `test/eslint.config.js`.

When adding a rule or modifying behavior: update `fixtures.ts` with positive/negative cases, then update the expected violations array in `run.js`.

## Release Process

Use semver to determine the appropriate bump level based on the nature of changes (major for breaking, minor for new features, patch for fixes).

Pre-release: `yarn version --pre<major|minor|patch> --preid beta` then `npm publish --tag beta`
Stable: `yarn version --<major|minor|patch>` then `npm publish`
