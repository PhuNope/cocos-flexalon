'use strict';
// Validate every packaged ZIP entry against the source tree, including decompression.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const pkg = require('../package.json');
const { getReleaseEntries } = require('./release-manifest.cjs');
const root = path.resolve(__dirname, '..');
const zip = path.join(root, 'release', `${pkg.name}-v${pkg.version}.zip`);
const raw = fs.readFileSync(zip);
const table = new Uint32Array(256);
for (let i = 0; i < 256; ++i) {
    let v = i;
    for (let k = 0; k < 8; ++k) v = v & 1 ? (v >>> 1) ^ 0xEDB88320 : v >>> 1;
    table[i] = v >>> 0;
}
function crc32(data) {
    let c = 0xFFFFFFFF;
    for (const b of data) c = table[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}
assert.equal(raw.readUInt32LE(raw.length - 22), 0x06054b50, 'Bad End of Central Directory');
const count = raw.readUInt16LE(raw.length - 12);
let at = raw.readUInt32LE(raw.length - 6);
const seen = new Set();
const allowed = new Set(getReleaseEntries(root).map(e => `flexalon-tools/${e.rel}`));
for (let i = 0; i < count; i++) {
    assert.equal(raw.readUInt32LE(at), 0x02014b50, 'Bad Central Directory header');
    const size = raw.readUInt32LE(at + 20);
    const fullSize = raw.readUInt32LE(at + 24);
    const expectedCrc = raw.readUInt32LE(at + 16);
    const nameSize = raw.readUInt16LE(at + 28);
    const extraSize = raw.readUInt16LE(at + 30);
    const commentSize = raw.readUInt16LE(at + 32);
    const localOffset = raw.readUInt32LE(at + 42);
    const name = raw.subarray(at + 46, at + 46 + nameSize).toString('utf8');
    assert.ok(name.startsWith('flexalon-tools/'), `Wrong ZIP root: ${name}`);
    assert.ok(!name.includes('..') && !name.includes('\\') && !name.includes('/node_modules/') && !name.includes('/release/'), `Unsafe path ${name}`);
    assert.ok(!seen.has(name), `Duplicate ZIP path ${name}`);
    assert.ok(allowed.has(name), `File not on installer allowlist: ${name}`);
    seen.add(name);
    assert.equal(raw.readUInt32LE(localOffset), 0x04034b50, `Bad local header: ${name}`);
    const localNameSize = raw.readUInt16LE(localOffset + 26);
    const localExtraSize = raw.readUInt16LE(localOffset + 28);
    const compressedAt = localOffset + 30 + localNameSize + localExtraSize;
    const inflated = zlib.inflateRawSync(raw.subarray(compressedAt, compressedAt + size));
    assert.equal(inflated.length, fullSize, `Size mismatch: ${name}`);
    assert.equal(crc32(inflated), expectedCrc, `Bad CRC: ${name}`);
    const diskName = path.join(root, name.slice('flexalon-tools/'.length));
    assert.deepEqual(inflated, fs.readFileSync(diskName), `Source file differs from ZIP: ${name}`);
    at += 46 + nameSize + extraSize + commentSize;
}
for (const required of [
    'package.json', 'assets/flexalon/Core/FlexalonObject.ts',
    'assets/flexalon/Layouts/FlexalonGridLayout.ts',
    'dist/main.js', 'dist/scene.js', 'dist/panels/guide/client.js',
    'dist/contributions/inspector/FlexalonGridLayout.js',
    'static/guide-icon.png', 'README_VI.md',
    'docs/MIGRATION_VI.md', 'scripts/migrate-legacy.cjs'
]) assert.ok(seen.has(`flexalon-tools/${required}`), `Missing release file: ${required}`);
assert.deepEqual(seen, allowed, 'Release ZIP must contain exactly the installer allowlist');
for (const banned of ['src/main.ts','package-lock.json','tsconfig.json','README.md','docs/Guide_Preview.png','docs/Flexalon_Guide_VI.html','scripts/package-release.cjs']) {
    assert.ok(!seen.has(`flexalon-tools/${banned}`), `Non-installer file was packaged: ${banned}`);
}
assert.ok(count > 115, `Too few packaged files: ${count}`);
console.log(`[Flexalon Release] PASS: ${count} ZIP entries decompressed and verified (${path.basename(zip)})`);
