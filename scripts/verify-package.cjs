'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const pkg=require(path.join(root,'package.json'));
assert.equal(pkg.name,'flexalon-tools');
assert.equal(pkg.editor,'>=3.8.2');
assert.equal(pkg.contributions['asset-db'].mount.path,'./assets');
assert.equal(pkg.contributions['asset-db'].mount.readonly,true);
assert.match(pkg.version,/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/);
assert.ok(pkg.scripts.release,'Missing npm run release');
const runtime=path.join(root,'assets','flexalon');
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>{
 const file=path.join(p,e.name);return e.isDirectory()?[file,...walk(file)]:[file];
});}
const all=walk(runtime);
const scripts=all.filter(p=>p.endsWith('.ts'));
assert.equal(scripts.length,43);
const metas=[path.join(root,'assets/flexalon.meta'),...all.filter(p=>p.endsWith('.meta'))];
const seen=new Set();
for(const f of [...all.filter(p=>fs.statSync(p).isDirectory()),...scripts]) {
 const file=f+'.meta';
 assert.ok(fs.existsSync(file),`Missing meta: ${path.relative(root,file)}`);
}
for(const m of metas){
 assert.ok(fs.existsSync(m),m);
 const d=JSON.parse(fs.readFileSync(m,'utf8'));
 assert.ok(d.uuid,'Missing UUID: '+m);
 assert.ok(!seen.has(d.uuid),'Duplicate UUID: '+d.uuid);
 seen.add(d.uuid);
}
const components=Object.entries(pkg.contributions.inspector.section.node);
assert.equal(components.length,18);
for(const [name,dest] of components) {
 assert.ok(fs.existsSync(path.join(root,dest)),dest);
 assert.ok(scripts.some(f=>fs.readFileSync(f,'utf8').includes(`@ccclass('${name}')`)),name);
}
for(const file of ['dist/main.js','dist/scene.js','dist/panels/guide.js','dist/panels/guide/client.js','docs/Flexalon_Guide_VI.html']) {
 assert.ok(fs.existsSync(path.join(root,file)),file);
}
const guide=require(path.join(root,'dist/panels/guide/content.js'));
assert.equal(guide.length,19);
assert.match(guide[0].steps[0],/extensions\/flexalon-tools/);
assert.doesNotMatch(guide[0].steps[0],/Copy assets\/flexalon/);
console.log('PASS: 1 extension; 43 runtime scripts; '+metas.length+' metadata files with unique UUIDs; 18 Inspectors; 19 guide lessons; Cocos >=3.8.2 mount');
