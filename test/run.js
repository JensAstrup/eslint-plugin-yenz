import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const fixtureFile = path.resolve(__dirname, 'fixtures.ts');
const configFile = path.resolve(__dirname, 'eslint.config.js');

const expected = [
  { line: 3, ruleId: 'yenz/type-ordering' },
  { line: 4, ruleId: 'yenz/type-ordering' },
  { line: 13, ruleId: 'yenz/no-loops' },
  { line: 14, ruleId: 'yenz/no-loops' },
  { line: 15, ruleId: 'yenz/no-loops' },
  { line: 26, ruleId: 'yenz/no-named-arrow-functions' },
  { line: 27, ruleId: 'yenz/no-named-arrow-functions' },
  { line: 28, ruleId: 'yenz/no-named-arrow-functions' },
  { line: 29, ruleId: 'yenz/no-named-arrow-functions' },
];

let output;
try {
  output = execSync(
    `npx eslint --config ${configFile} -f json ${fixtureFile}`,
    { encoding: 'utf-8', cwd: root }
  );
} catch (err) {
  // ESLint exits with code 1 when there are violations
  output = err.stdout;
}

const results = JSON.parse(output);
const actual = [];
for (const file of results) {
  for (const msg of file.messages) {
    actual.push({ line: msg.line, ruleId: msg.ruleId });
  }
}

const key = (v) => `${v.line}:${v.ruleId}`;
const expectedSet = new Set(expected.map(key));
const actualSet = new Set(actual.map(key));

const missing = expected.filter((v) => !actualSet.has(key(v)));
const unexpected = actual.filter((v) => !expectedSet.has(key(v)));

let failed = false;
if (missing.length > 0) {
  console.error('Missing expected violations:');
  for (const v of missing) {
    console.error(`  line ${v.line}: ${v.ruleId}`);
  }
  failed = true;
}
if (unexpected.length > 0) {
  console.error('Unexpected violations:');
  for (const v of unexpected) {
    console.error(`  line ${v.line}: ${v.ruleId}`);
  }
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log(`All ${expected.length} expected violations matched.`);
}
