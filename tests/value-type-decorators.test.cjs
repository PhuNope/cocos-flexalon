'use strict';
/** Guard against Cocos Creator warnings about redundant ValueType @property types. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../assets/flexalon');
const types = /\btype\s*:\s*(?:Vec2|Vec3|Vec4|Quat|Color|Size|Rect|Mat3|Mat4)\b/;
let scannedFiles = 0, scannedDecorators = 0;
function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(file); continue; }
        if (!entry.isFile() || !file.endsWith('.ts')) continue;
        scannedFiles++;
        const source = fs.readFileSync(file, 'utf8');
        // Match even when @property options span lines or have a visible() callback.
        for (const found of source.matchAll(/@property\s*\(\s*\{[\s\S]*?\}\s*\)/g)) {
            scannedDecorators++;
            assert.doesNotMatch(found[0], types, 'Redundant ValueType property declaration: ' + file);
        }
    }
}
walk(root);
assert.equal(scannedFiles, 43, 'Expected Flexalon runtime scripts to be covered');
assert.ok(scannedDecorators > 30, 'No serialized property decorators were inspected');
console.log('PASS: No redundant ValueType @property types in ' + scannedFiles + ' Flexalon runtime scripts');
