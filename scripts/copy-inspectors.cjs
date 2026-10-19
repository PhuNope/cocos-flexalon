// Copy CommonJS Inspector scripts because tsc compiles only extension .ts files.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const from = path.join(root, 'src/contributions/inspector');
const to = path.join(root, 'dist/contributions/inspector');
fs.mkdirSync(to,{recursive:true});
for (const file of fs.readdirSync(from)) {
    if (file.endsWith('.js')) fs.copyFileSync(path.join(from,file),path.join(to,file));
}
console.log('[Flexalon] Inspector scripts copied to dist.');

// Bundle Guide Panel assets for a fresh extension install (no npm install needed).
const panelFrom = path.join(root,'src/panels/guide');
const panelTo = path.join(root,'dist/panels/guide');
fs.mkdirSync(panelTo,{recursive:true});
for (const file of ['client.js','content.js','index.html','index.css']) {
  fs.copyFileSync(path.join(panelFrom,file),path.join(panelTo,file));
}
console.log('[Flexalon] Illustrated Guide Panel resources copied to dist.');
