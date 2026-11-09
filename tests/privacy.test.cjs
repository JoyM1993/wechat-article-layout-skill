const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {trackedTextEntries, privacyViolations} = require('./helpers/privacy.cjs');

test('privacy inventory includes SVG, lockfile, tests and future tracked text', () => {
  const root = path.resolve(__dirname, '..');
  const names = trackedTextEntries(root).map(entry => entry.file);
  for (const file of ['examples/reading-cards.svg','package-lock.json','tests/render_raphael.test.cjs','tests/package.test.cjs']) {
    assert.ok(names.includes(file), `Missing tracked text: ${file}`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'privacy-inventory-'));
  try {
    fs.writeFileSync(path.join(dir, 'future.txt'), 'ordinary public text');
    execFileSync('git', ['init', dir], {stdio:'ignore'});
    execFileSync('git', ['-C', dir, 'add', 'future.txt'], {stdio:'ignore'});
    assert.deepEqual(trackedTextEntries(dir).map(entry => entry.file), ['future.txt']);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});

test('privacy rules catch leaks regardless of tracked filename without echoing values', () => {
  const syntheticPath = ['/', 'home', '/', 'fictional-user', '/', 'private'].join('');
  const entries = ['examples/picture.svg','package-lock.json','tests/future.test.cjs','future.txt'].map(file => ({file, content:syntheticPath}));
  const violations = privacyViolations(entries);
  assert.equal(violations.length, entries.length);
  assert.ok(violations.every(item => item.kind === 'machine-path'));
  assert.ok(!JSON.stringify(violations).includes(syntheticPath), 'Violation diagnostics must not echo matched content');
});

test('privacy rules detect email and token patterns but allow public URLs', () => {
  const email = ['fictional-user', 'example', 'invalid'].join('@').replace('@invalid', '.invalid');
  const token = ['gh', 'p', '_', 'x'.repeat(24)].join('');
  assert.equal(privacyViolations([{file:'a.txt',content:email}])[0].kind, 'email');
  assert.equal(privacyViolations([{file:'b.txt',content:token}])[0].kind, 'credential-pattern');
  assert.deepEqual(privacyViolations([{file:'README.md',content:'https://example.com/public'}]), []);
});
