const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const adapter = require('../wechat-article-layout-skill/scripts/render_raphael.cjs');

test('missing and unknown bundles fail closed', () => {
  assert.throws(() => adapter.loadBundle('not-present.js'), /ENOENT/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-test-'));
  try {
    const file = path.join(dir, 'fake.js');
    fs.writeFileSync(file, 'throw new Error("must not execute")');
    assert.throws(() => adapter.loadBundle(file), /Unrecognized Raphael bundle/);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});

test('Markdown input is a real local .md file', () => {
  assert.throws(() => adapter.readArticle('https://example.com/a.md'), /local Markdown/);
  assert.throws(() => adapter.readArticle('//server/share/a.md'), /local Markdown/);
  assert.throws(() => adapter.readArticle(__filename), /local Markdown/);
  assert.throws(() => adapter.readArticle('missing.md'), /ENOENT/);
});

test('image resolver rejects traversal, protocols and encoded escapes', () => {
  const root = path.dirname(__filename);
  for (const src of ['../outside.png', '%2e%2e/outside.png', 'https://example.com/x.png', 'file:///tmp/a.png', 'data:image/svg+xml,evil', ['C', ':', '\\x.png'].join(''), '\\x.png']) {
    assert.throws(() => adapter.resolveImage(root, src), /local image|outside article/);
  }
});

test('image symlink cannot escape article directory', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-link-'));
  try {
    fs.mkdirSync(path.join(dir, 'article'));
    fs.mkdirSync(path.join(dir, 'outside'));
    fs.writeFileSync(path.join(dir, 'outside/image.png'), 'not-private');
    try { fs.symlinkSync(path.join(dir, 'outside'), path.join(dir, 'article/link'), process.platform === 'win32' ? 'junction' : 'dir'); }
    catch (e) { if (e.code === 'EPERM') return t.skip('symlink permission unavailable'); throw e; }
    assert.throws(() => adapter.resolveImage(path.join(dir, 'article'), 'link/image.png'), /outside article/);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});

test('receipt never implies cloud drafts or publication', () => {
  const receipt = adapter.makeReceipt({title:'Fiction', theme:'sspai', embeddedImages:[]});
  assert.equal(receipt.cloudDraftCreated, false);
  assert.equal(receipt.published, false);
  assert.equal(receipt.engineSHA256, adapter.BUNDLE_SHA256);
});

test('title is escaped for HTML', () => {
  assert.equal(adapter.escapeHTML('<x> & "y"'), '&lt;x&gt; &amp; &quot;y&quot;');
});

test('CLI accepts only declared nonduplicated options', () => {
  assert.deepEqual(adapter.parseArgs(['--input','article.md','--out','output','--bundle','engine.js']), {input:'article.md',out:'output',bundle:'engine.js'});
  assert.throws(() => adapter.parseArgs([]), /Missing --input/);
  assert.throws(() => adapter.parseArgs(['--input','a.md','--input','b.md']), /Use --input/);
  assert.throws(() => adapter.parseArgs(['--jsdom','custom-code']), /Use --input/);
});

test('exact official build renders fictional article when supplied', {skip: !process.env.RAPHAEL_BUNDLE}, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-e2e-'));
  try {
    await adapter.render({input:path.resolve(__dirname, '../examples/fictional-article.md'), out:dir, bundle:process.env.RAPHAEL_BUNDLE, theme:'sspai'});
    const receipt = JSON.parse(fs.readFileSync(path.join(dir, 'receipt.json'), 'utf8'));
    assert.equal(receipt.published, false);
    assert.equal(receipt.embeddedImages.length, 1);
    assert.match(fs.readFileSync(path.join(dir, 'wechat.html'), 'utf8'), /data:image\/svg\+xml;base64/);
    assert.match(fs.readFileSync(path.join(dir, 'preview.html'), 'utf8'), /name="viewport"/);
    const original = fs.readFileSync(path.join(dir, 'wechat.html'), 'utf8');
    await assert.rejects(adapter.render({input:path.resolve(__dirname, '../examples/fictional-article.md'), out:dir, bundle:process.env.RAPHAEL_BUNDLE}), /Output exists/);
    assert.equal(fs.readFileSync(path.join(dir, 'wechat.html'), 'utf8'), original);
    await assert.rejects(adapter.render({input:path.resolve(__dirname, '../examples/fictional-article.md'), out:path.join(dir,'unknown'), bundle:process.env.RAPHAEL_BUNDLE,theme:'not-a-theme'}), /Unknown theme/);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});
