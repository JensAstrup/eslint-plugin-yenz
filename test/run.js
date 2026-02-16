import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const fixtureFile = path.resolve(__dirname, 'fixtures.ts');
const configFile = path.resolve(__dirname, 'eslint.config.js');

function parseFixture() {
  const lines = readFileSync(fixtureFile, 'utf-8').split('\n');
  const expectedViolations = [];
  const expectedFixes = [];

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    const errorMatch = line.match(/\/\/ expect-error (\S+)/);
    if (errorMatch) {
      expectedViolations.push({ line: lineNumber, ruleId: errorMatch[1] });
    }

    const fixMatch = line.match(/\/\/ fix: (.+)$/);
    if (fixMatch) {
      expectedFixes.push({ line: lineNumber, expectedCode: fixMatch[1].trim() });
    }
  }

  return { expectedViolations, expectedFixes };
}

function runESLint(extraArgs = '') {
  try {
    return execSync(
      `npx eslint --config ${configFile} -f json ${extraArgs} ${fixtureFile}`,
      { encoding: 'utf-8', cwd: root }
    );
  } catch (err) {
    if (err.stdout) {
      return err.stdout;
    }
    console.error('ESLint produced no output.');
    if (err.stderr) {
      console.error('stderr:', err.stderr);
    }
    process.exit(1);
  }
}

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    console.error('Failed to parse ESLint JSON output:', text.slice(0, 500));
    process.exit(1);
  }
}

function checkViolations(expectedViolations) {
  const results = parseJSON(runESLint());
  const actual = [];
  for (const file of results) {
    for (const msg of file.messages) {
      actual.push({ line: msg.line, ruleId: msg.ruleId });
    }
  }

  const key = (v) => `${v.line}:${v.ruleId}`;
  const expectedSet = new Set(expectedViolations.map(key));
  const actualSet = new Set(actual.map(key));

  const missing = expectedViolations.filter((v) => !actualSet.has(key(v)));
  const unexpected = actual.filter((v) => !expectedSet.has(key(v)));
  const matched = expectedViolations.length - missing.length;

  return { missing, unexpected, matched, total: expectedViolations.length };
}

function checkFixes(expectedFixes) {
  if (expectedFixes.length === 0) return { mismatches: [], matched: 0, total: 0 };

  const fixResults = parseJSON(runESLint('--fix-dry-run'));
  const fixedOutput = fixResults[0].output;

  if (!fixedOutput) {
    console.error('ESLint --fix-dry-run produced no output field.');
    process.exit(1);
  }

  const fixedLines = fixedOutput.split('\n');
  const mismatches = [];

  for (const { line, expectedCode } of expectedFixes) {
    const fixedLine = fixedLines[line - 1];
    const actualCode = fixedLine.replace(/\s*\/\/ expect-error.*$/, '').trimEnd();

    if (actualCode !== expectedCode) {
      mismatches.push({ line, expectedCode, actualCode });
    }
  }

  return { mismatches, matched: expectedFixes.length - mismatches.length, total: expectedFixes.length };
}

const { expectedViolations, expectedFixes } = parseFixture();
const violations = checkViolations(expectedViolations);
const fixes = checkFixes(expectedFixes);

let failed = false;

if (violations.missing.length > 0) {
  console.error(`\nMissing expected violations (${violations.missing.length}):`);
  for (const violation of violations.missing) {
    console.error(`  line ${violation.line}: ${violation.ruleId}`);
  }
  failed = true;
}

if (violations.unexpected.length > 0) {
  console.error(`\nUnexpected violations (${violations.unexpected.length}):`);
  for (const violation of violations.unexpected) {
    console.error(`  line ${violation.line}: ${violation.ruleId}`);
  }
  failed = true;
}

if (fixes.mismatches.length > 0) {
  console.error(`\nFix mismatches (${fixes.mismatches.length}):`);
  for (const mismatch of fixes.mismatches) {
    console.error(`  line ${mismatch.line}:`);
    console.error(`    expected: ${mismatch.expectedCode}`);
    console.error(`    actual:   ${mismatch.actualCode}`);
  }
  failed = true;
}

console.log(`\nViolations: ${violations.matched}/${violations.total} passed`);
if (fixes.total > 0) {
  console.log(`Fixes:      ${fixes.matched}/${fixes.total} passed`);
}

if (failed) {
  process.exit(1);
}
