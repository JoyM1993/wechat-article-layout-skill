'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const BUNDLE_SHA256 = 'a72c53c9b1eba634cfa27d01f62c882d9d6035aa41be04bc801d203ba3e3b069';
const BUNDLE_URL = 'https://publish.raphael.app/assets/index-B1xyRFkz.js';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}

function readArticle(input) {
  if (/^[\\/]{2}/.test(input) || /^[a-z][a-z\d+.-]*:/i.test(input) && !path.isAbsolute(input) || path.extname(input).toLowerCase() !== '.md') {
    throw new Error('Use a local Markdown .md file');
  }
  const file = fs.realpathSync(input);
  if (!fs.statSync(file).isFile()) throw new Error('Use a local Markdown file');
  return {file, root:path.dirname(file), markdown:fs.readFileSync(file, 'utf8')};
}

function loadBundle(file) {
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== BUNDLE_SHA256) throw new Error('Unrecognized Raphael bundle; inspect upstream and update the adapter before use');
  const source = bytes.toString('utf8');
  const stop = source.lastIndexOf('dO(document.getElementById("root")).render(');
  if (stop < 0) throw new Error('Raphael entry point changed');
  return source.slice(0, stop) + '\nglobalThis.RaphaelEngine={themes:$l,render:(md,t)=>X6($6(ub.render(q6(md)),t)),wechat:t8};';
}

function resolveImage(root, src) {
  let decoded;
  try { decoded = decodeURIComponent(src); } catch { throw new Error('Use a valid local image path'); }
  if (/^[a-z][a-z\d+.-]*:|^[\\/]|\x00/i.test(decoded) || decoded.includes('\\')) throw new Error('Use a relative local image path');
  const base = fs.realpathSync(root);
  const candidate = path.resolve(base, decoded);
  const within = file => { const relative = path.relative(base, file); return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative); };
  if (!within(candidate)) throw new Error('Image outside article directory');
  const file = fs.realpathSync(candidate);
  if (!within(file)) throw new Error('Image outside article directory');
  return file;
}

function makeReceipt({title, theme, embeddedImages}) {
  return {title, engine:BUNDLE_URL, engineSHA256:BUNDLE_SHA256, theme, embeddedImages, cloudDraftCreated:false, published:false};
}

async function render(options) {
  const article = readArticle(options.input);
  const source = loadBundle(options.bundle);
  const {JSDOM} = require('jsdom');
  // This is a compatibility runtime, NOT a security sandbox. Use trusted input and
  // the exact reviewed build, preferably inside an OS-level no-network sandbox.
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {runScripts:'outside-only', pretendToBeVisual:true, url:'https://publish.raphael.app/'});
  try {
    dom.window.TextEncoder = TextEncoder;
    dom.window.TextDecoder = TextDecoder;
    dom.window.fetch = async () => { throw new Error('Local renderer network disabled'); };
    dom.window.XMLHttpRequest = class { constructor() { throw new Error('Local renderer network disabled'); } };
    dom.window.WebSocket = class { constructor() { throw new Error('Local renderer network disabled'); } };
    dom.window.eval(source);
    const engine = dom.window.RaphaelEngine;
    const theme = options.theme || 'sspai';
    if (!engine.themes.some(item => item.id === theme)) throw new Error(`Unknown theme: ${theme}`);
    const doc = new dom.window.DOMParser().parseFromString(engine.render(article.markdown, theme), 'text/html');
    // The draft may contain author-supplied HTML. Remove executable/remote embeds
    // and event attributes before writing a preview that a user might open.
    for (const el of doc.querySelectorAll('script,iframe,object,embed,link,meta,base,style,form,svg,math,audio,video,source')) el.remove();
    for (const el of doc.querySelectorAll('*')) {
      for (const attr of [...el.attributes]) {
        if (/^on/i.test(attr.name) || ['srcset','srcdoc','background','action','formaction','ping'].includes(attr.name) || attr.name === 'style' && /url\s*\(|@import|expression\s*\(/i.test(attr.value)) el.removeAttribute(attr.name);
      }
      if (el.hasAttribute('href') && !/^(https?:\/\/|#)/i.test(el.getAttribute('href'))) el.removeAttribute('href');
    }
    const embeddedImages = [];
    for (const image of doc.querySelectorAll('img')) {
      const src = image.getAttribute('src');
      if (!src) throw new Error('Image missing src');
      const file = resolveImage(article.root, src);
      const mime = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file).toLowerCase()];
      if (!mime) throw new Error('Unsupported local image type');
      const bytes = fs.readFileSync(file);
      if (mime === 'image/svg+xml' && /<(?:script|foreignObject)|\bon\w+\s*=|(?:href|url)\s*[=(]|@import/i.test(bytes.toString('utf8'))) throw new Error('SVG must be a self-contained static image');
      image.setAttribute('src', `data:${mime};base64,${bytes.toString('base64')}`);
      image.setAttribute('style', (image.getAttribute('style') || '') + ';max-width:100%;height:auto;');
      embeddedImages.push({file:path.relative(article.root, file).split(path.sep).join('/'), bytes:bytes.length, sha256:sha256(bytes)});
    }
    const html = await engine.wechat(doc.body.innerHTML, theme);
    const title = (article.markdown.match(/^#\s+(.+)$/m) || [null, 'Local article'])[1];
    const preview = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'">' +
      `<title>${escapeHTML(title)}</title><style>body{margin:0;background:#eee}main{max-width:700px;margin:auto;padding:20px;background:white;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style></head><body><main>${html}</main></body></html>`;
    const output = path.resolve(options.out);
    fs.mkdirSync(output, {recursive:true});
    // Do not overwrite an approved draft or earlier output accidentally.
    for (const file of ['preview.html','wechat.html','receipt.json']) if (fs.existsSync(path.join(output,file))) throw new Error('Output exists; choose a new output directory');
    fs.writeFileSync(path.join(output, 'preview.html'), preview, {flag:'wx'});
    fs.writeFileSync(path.join(output, 'wechat.html'), html, {flag:'wx'});
    const receipt = makeReceipt({title, theme, embeddedImages});
    fs.writeFileSync(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', {flag:'wx'});
    return receipt;
  } finally { dom.window.close(); }
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!['input','out','bundle','theme'].includes(key) || !argv[i].startsWith('--') || !argv[i+1] || options[key]) throw new Error('Use --input file.md --out directory --bundle official.js [--theme sspai]');
    options[key] = argv[i+1];
  }
  for (const key of ['input','out','bundle']) if (!options[key]) throw new Error(`Missing --${key}`);
  return options;
}

module.exports = {BUNDLE_SHA256, escapeHTML, readArticle, loadBundle, resolveImage, makeReceipt, render, parseArgs};
if (require.main === module) {
  Promise.resolve().then(() => render(parseArgs(process.argv.slice(2)))).then(receipt => console.log(JSON.stringify({theme:receipt.theme, images:receipt.embeddedImages.length, cloudDraftCreated:false, published:false}))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
