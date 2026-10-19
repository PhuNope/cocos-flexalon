'use strict';
/**
 * Dependency-free, cross-platform ZIP packaging for GitHub releases.
 * Uses an explicit installer allowlist; excludes source, tests, build
 * tooling, repository automation, caches and optional preview docs.
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const outputDir = path.join(ROOT, 'release');
const archiveName = `${manifest.name}-v${manifest.version}.zip`;
const targetFile = path.join(outputDir, archiveName);
const archiveRoot = manifest.name;
const { getReleaseEntries } = require('./release-manifest.cjs');

assert.equal(manifest.name, 'flexalon-tools', 'Unexpected extension name');
assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/, 'Invalid semver');
if (process.env.RELEASE_TAG) {
    assert.equal(process.env.RELEASE_TAG, `v${manifest.version}`, 'RELEASE_TAG must match package.json version');
}

const entries = getReleaseEntries(ROOT);

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c >>> 0;
}
function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (const byte of data) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Fixed timestamp for consistent ZIP entries on Linux, macOS and Windows.
const dosTime = 0;
const dosDate = ((2020 - 1980) << 9) | (1 << 5) | 1;
const localParts = [];
const centralParts = [];
let offset = 0;
let count = 0;
for (const { absolute, rel } of entries) {
    const name = Buffer.from(`${archiveRoot}/${rel.replaceAll('\\', '/')}`, 'utf8');
    const original = fs.readFileSync(absolute);
    const compressed = zlib.deflateRawSync(original, { level: 9 });
    const checksum = crc32(original);
    assert.ok(name.length <= 65535 && original.length <= 0xFFFFFFFF && compressed.length <= 0xFFFFFFFF,
        `Entry exceeds classic ZIP limits: ${rel}`);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(original.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4); // Unix-made archive
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(original.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
    ++count;
    assert.ok(offset <= 0xFFFFFFFF, 'Release ZIP is larger than 4 GiB (ZIP64 needed)');
}
assert.ok(count > 0 && count <= 0xFFFF, 'Too many ZIP files');
const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(count, 8);
eocd.writeUInt16LE(count, 10);
eocd.writeUInt32LE(centralSize, 12);
eocd.writeUInt32LE(offset, 16);

fs.mkdirSync(outputDir, { recursive: true });
const staged = `${targetFile}.tmp`;
try {
    fs.writeFileSync(staged, Buffer.concat([...localParts, ...centralParts, eocd]));
    fs.renameSync(staged, targetFile);
} finally {
    if (fs.existsSync(staged)) fs.rmSync(staged);
}
console.log(`[Flexalon Release] ${path.relative(ROOT, targetFile)} (${count} files, ${fs.statSync(targetFile).size} bytes)`);
console.log('[Flexalon Release] ZIP root: flexalon-tools/');
