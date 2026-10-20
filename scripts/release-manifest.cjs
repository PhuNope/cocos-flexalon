'use strict';
/**
 * Explicit allowlist for installable GitHub Release ZIPs.
 * Nothing gets into the archive just because it exists in the repo.
 *
 * Keep this list intentionally small:
 * - assets: Cocos runtime scripts + UUID-preserving .meta files.
 * - dist: only compiled files referenced by Cocos manifest + their dependencies.
 * - fixed files: extension manifest, install docs and legacy migrator.
 *
 * To add an installer resource, explicitly update this file and the
 * release verification tests. The source repository remains unrestricted.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const INSTALL_FILES = Object.freeze([
    'package.json',
    'updater/service.cjs',
    'updater/helper.cjs',
    'README_VI.md',
    'static/guide-icon.png',
    'scripts/migrate-legacy.cjs',
    'docs/MIGRATION_VI.md',
]);

const INSTALL_DIRS = Object.freeze([
    { directory: 'assets', extensions: ['.ts', '.meta'] },
]);

function getReleaseEntries(root) {
    const entries = [];
    function collect(directory, extensions) {
        const current = path.join(root, directory);
        assert.ok(fs.statSync(current).isDirectory(), `Missing directory: ${directory}`);
        for (const item of fs.readdirSync(current, { withFileTypes: true })) {
            const relative = path.posix.join(directory, item.name);
            const absolute = path.join(root, relative);
            // Do not follow symlinks, even to paths within the repository.
            if (item.isSymbolicLink()) throw new Error(`Symlink not allowed in release: ${relative}`);
            if (item.isDirectory()) collect(relative, extensions);
            else if (item.isFile() && extensions.includes(path.extname(item.name))) {
                entries.push({ absolute, rel: relative });
            }
        }
    }
    for (const spec of INSTALL_DIRS) collect(spec.directory, spec.extensions);
    // The Editor output has a strict file allowlist instead of blindly packing
    // every file under dist/. Newly generated or stale JS is not auto-published.
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const compiledFiles = [
        pkg.main,
        pkg.contributions.scene.script,
        ...Object.values(pkg.contributions.inspector.section.node),
        pkg.panels.guide.main,
        './dist/contributions/inspector/shared.js',
        './dist/panels/guide/client.js',
        './dist/panels/guide/content.js',
        './dist/panels/guide/index.css',
        './dist/panels/guide/index.html',
    ].map(s => {
        assert.ok(typeof s === 'string' && s.startsWith('./dist/'), `Invalid Editor asset path: ${s}`);
        return s.slice(2);
    });
    for (const relative of [...INSTALL_FILES, ...compiledFiles]) {
        const absolute = path.join(root, relative);
        assert.ok(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `Missing install file: ${relative}`);
        entries.push({ absolute, rel: relative });
    }
    entries.sort((a, b) => a.rel.localeCompare(b.rel, 'en'));
    assert.equal(new Set(entries.map(e => e.rel)).size, entries.length, 'Duplicate release file path');
    return entries;
}

module.exports = { INSTALL_FILES, INSTALL_DIRS, getReleaseEntries };

if (require.main === module) {
    const root = path.resolve(__dirname, '..');
    const entries = getReleaseEntries(root);
    for (const { rel } of entries) console.log(rel);
    console.log(`Total: ${entries.length} installer files (allowlist only)`);
}
