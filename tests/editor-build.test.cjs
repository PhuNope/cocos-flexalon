'use strict';
// Reproduce a Cocos project that exposes ancestor @types/node to an extension.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const compiler = require.resolve('typescript/bin/tsc');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flexalon-editor-build-'));
try {
  const project = path.join(tmp, 'project');
  const extension = path.join(project, 'extensions', 'flexalon-tools');
  const types = path.join(project, 'node_modules', '@types', 'node');
  fs.mkdirSync(types, { recursive: true });
  fs.writeFileSync(path.join(types, 'index.d.ts'),
    'declare var module: { exports: unknown };\ndeclare var require: (id: string) => unknown;\ndeclare var __dirname: string;\n');
  fs.mkdirSync(extension, { recursive: true });
  fs.cpSync(path.join(root, 'src'), path.join(extension, 'src'), { recursive: true });
  fs.copyFileSync(path.join(root, 'tsconfig.json'), path.join(extension, 'tsconfig.json'));
  const result = spawnSync(process.execPath, [compiler, '-p', 'tsconfig.json'],
    { cwd: extension, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const relative of ['main.js', 'scene.js', 'panels/guide.js']) {
    const actual = fs.readFileSync(path.join(extension, 'dist', relative));
    const locallyBuilt = fs.readFileSync(path.join(root, 'dist', relative));
    assert.deepEqual(actual, locallyBuilt, 'Nested build differs from local build: ' + relative);
  }
  // Ensure module scoping did not change the CommonJS panel export contract.
  const module = { exports: {} };
  const panel = { define: value => value };
  vm.runInNewContext(fs.readFileSync(path.join(extension, 'dist/panels/guide.js'), 'utf8'), {
    module, exports: module.exports, __dirname: path.join(extension, 'dist/panels'),
    Editor: { Panel: panel },
    require: name => name === 'node:path' ? path : name === 'node:fs' ?
      { readFileSync: () => '' } : {},
  });
  assert.equal(typeof module.exports.ready, 'function');
  assert.equal(typeof module.exports.close, 'function');
  assert.equal(typeof module.exports.methods.openTopic, 'function');

  // Release ZIP does not include src or tsconfig. Its lifecycle hook must
  // succeed without trying to compile or requiring the development compiler.
  const release = path.join(tmp, 'installed-zip');
  fs.mkdirSync(release);
  fs.copyFileSync(path.join(root, 'package.json'), path.join(release, 'package.json'));
  const hook = require(path.join(root, 'package.json')).scripts.postinstall;
  assert.ok(hook.startsWith('node -e "'));
  const code = hook.slice('node -e "'.length, -1);
  const installed = spawnSync(process.execPath, ['-e', code], { cwd: release, encoding: 'utf8' });
  assert.equal(installed.status, 0, installed.stdout + installed.stderr);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log('PASS: nested Cocos @types isolation, reproducible Editor build, CommonJS Guide export, release postinstall no-op.');
