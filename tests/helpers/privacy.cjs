'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

function trackedTextEntries(root) {
  let files;
  if (fs.existsSync(path.join(root, '.git'))) {
    // Inventory the index rather than a hardcoded extension or filename subset.
    // A broken Git inventory is an audit failure, not a reason to scan less.
    files = execFileSync('git', ['-C', root, 'ls-files', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
  } else {
    // Downloaded source archives have no index. Scan all shipped files while
    // excluding only documented local-work paths created after installation.
    const local = new Set(['.git','node_modules','outputs','work','creator.local.yaml']);
    const walk = directory => fs.readdirSync(path.join(root, directory), {withFileTypes:true}).flatMap(entry => {
      if (local.has(entry.name) || entry.name === '.env' || entry.name.startsWith('.env.')) return [];
      const file = path.posix.join(directory, entry.name);
      return entry.isDirectory() ? walk(file) : [file];
    });
    files = walk('');
  }
  return files.flatMap(file => {
    const bytes = fs.readFileSync(path.join(root, file));
    if (bytes.includes(0)) return []; // binary assets remain a manual-review gate
    return [{file, content:bytes.toString('utf8')}];
  });
}

function privacyViolations(entries) {
  const rules = [
    ['machine-path', /(?:^|[\s"'`])[A-Z]:[\\/]|\/Users\/|\/home\//im],
    ['email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
    ['credential-pattern', /gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]
  ];
  // Never return matched values: assertion output must not expose a credential.
  return entries.flatMap(({file, content}) => rules.filter(([, pattern]) => pattern.test(content)).map(([kind]) => ({file, kind})));
}

module.exports = {trackedTextEntries, privacyViolations};
