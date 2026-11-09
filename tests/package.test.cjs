const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {trackedTextEntries, privacyViolations} = require('./helpers/privacy.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('skill metadata and relative links are portable', () => {
  const skill = read('wechat-article-layout-skill/SKILL.md');
  assert.match(skill, /^---\r?\nname: wechat-article-layout\r?\ndescription: Use when/m);
  for (const match of skill.matchAll(/\]\(([^)]+)\)/g)) {
    assert.ok(fs.existsSync(path.resolve(root, 'wechat-article-layout-skill', match[1])));
  }
  for (const phrase of ['latest approved', 'formatting-only', 'authorized', '360', 'local draft', 'original evidence']) assert.ok(skill.includes(phrase), phrase);
});

test('dependencies, README command and license are explicit', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies.jsdom, '26.1.0');
  assert.equal(pkg.license, 'MIT');
  assert.match(read('README.md'), /node wechat-article-layout-skill\/scripts\/render_raphael.cjs --input examples\/fictional-article.md --out outputs\/demo --bundle work\/raphael-bundle.js --theme sspai/);
  assert.match(read('LICENSE'), /Copyright \(c\) 2026 JoyM1993/);
  const refs = read('wechat-article-layout-skill/references/raphael.md');
  assert.match(refs, /Raphael Editor Contributors/);
  assert.match(refs, /github.com\/liuxiaopai-ai\/raphael-publish\/blob\/main\/LICENSE/);
});

test('ignore rules exclude local config, dependencies, bundles and outputs', () => {
  const ignore = read('.gitignore');
  for (const pattern of ['creator.local.yaml', 'outputs/', 'work/', 'node_modules/', '.env']) assert.ok(ignore.includes(pattern));
});

test('all tracked publishable text passes privacy pattern checks', () => {
  assert.deepEqual(privacyViolations(trackedTextEntries(root)), []);
});
