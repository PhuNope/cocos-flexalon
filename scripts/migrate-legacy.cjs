'use strict';
/** Offline migration from old project/assets/flexalon to mounted extension assets.
 * Run ONLY when Cocos Creator is closed. Keep external project backup.
 * Never deletes source files; moves legacy folder outside assets after backing up.
 */
const fs=require('node:fs');
const path=require('node:path');
const argv=process.argv.slice(2);
const i=argv.indexOf('--project');
if(i<0 || !argv[i+1]) {
  console.error('Usage: node extensions/flexalon-tools/scripts/migrate-legacy.cjs --project <project-root> [--dry-run]');
  process.exit(2);
}
const project=path.resolve(argv[i+1]);
const dry=argv.includes('--dry-run');
const extension=path.resolve(__dirname,'..');
const expected=path.join(project,'extensions','flexalon-tools');
if(path.resolve(extension)!==path.resolve(expected)) {
  console.error('ERROR: Only a project-local extension can be migrated. Expected:',expected);
  process.exit(2);
}
const legacy=path.join(project,'assets','flexalon');
const target=path.join(extension,'assets','flexalon');
if(!fs.existsSync(path.join(project,'assets')) || !fs.existsSync(legacy) || !fs.statSync(legacy).isDirectory()) {
  console.error('ERROR: No legacy assets/flexalon directory in project:',project);
  process.exit(2);
}
if(!fs.existsSync(path.join(extension,'package.json')) || !fs.existsSync(target)) {
  console.error('ERROR: Complete unified extension not found:',extension);
  process.exit(2);
}
if(fs.lstatSync(legacy).isSymbolicLink() || fs.lstatSync(target).isSymbolicLink()) {
  console.error('ERROR: Refusing migration using a symlink directory.');
  process.exit(2);
}
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=> {
  const full=path.join(p,e.name);
  return e.isDirectory()? walk(full):e.isFile()?[full]:[];
});}
const metas=walk(legacy).filter(f=>f.endsWith('.meta'));
const oldRootMeta=legacy+'.meta';
if(fs.existsSync(oldRootMeta)) metas.push(oldRootMeta);
const copy=[];
const seen=new Map();
for(const oldMeta of metas) {
  const rel=path.relative(legacy,oldMeta); // ../flexalon.meta handled separately
  if(rel.startsWith('..') && oldMeta!==oldRootMeta) throw Error('Unexpected metadata path outside old package');
  const newMeta=oldMeta===oldRootMeta?target+'.meta':path.join(target,rel);
  if(!fs.existsSync(newMeta)) {
    console.warn('[Flexalon] Legacy metadata skipped (no matching asset):',rel);
    continue;
  }
  const d=JSON.parse(fs.readFileSync(oldMeta,'utf8'));
  if(!d.uuid || typeof d.uuid!=='string') throw Error('Invalid old UUID: '+oldMeta);
  if(seen.has(d.uuid) && seen.get(d.uuid)!==newMeta) throw Error('Duplicate legacy UUID: '+d.uuid);
  seen.set(d.uuid,newMeta);
  copy.push({oldMeta,newMeta,uuid:d.uuid});
}
const replacing=new Set(copy.map(p=>p.newMeta));
const allTarget=[...walk(path.join(extension,'assets')).filter(f=>f.endsWith('.meta'))];
for(const file of allTarget) {
  if(replacing.has(file)) continue;
  const d=JSON.parse(fs.readFileSync(file,'utf8'));
  if(seen.has(d.uuid)) throw Error('UUID collision between '+file+' and '+seen.get(d.uuid));
}
const backupBase=path.join(project,'flexalon-migration-backups');
let backup=path.join(backupBase,'legacy-'+new Date().toISOString().replace(/[:.]/g,'-'));
for(let n=1;fs.existsSync(backup);n++) backup=path.join(backupBase,'legacy-backup-'+n);
console.log('[Flexalon] Previous scripts:',walk(legacy).filter(f=>f.endsWith('.ts')).length);
console.log('[Flexalon] Existing metadata to preserve:',copy.length);
console.log('[Flexalon] Backup location:',backup);
if(dry) { console.log('[Flexalon] DRY RUN: no files changed');process.exit(0); }
// First duplicate the old assets to an external backup; then atomically move the folder
// out of the project asset db. If a write fails, keep backup and let user restore.
fs.mkdirSync(backup,{recursive:true});
fs.cpSync(legacy,path.join(backup,'flexalon'),{recursive:true,errorOnExist:true});
if(fs.existsSync(oldRootMeta)) fs.copyFileSync(oldRootMeta,path.join(backup,'flexalon.meta'));
// Preserve metadata for existing scenes/prefabs; no need to rewrite their UUID fields.
const oldExtensionMeta=[];
try {
  for(const {oldMeta,newMeta} of copy) {
    oldExtensionMeta.push([newMeta,fs.readFileSync(newMeta)]);
    fs.copyFileSync(oldMeta,newMeta);
  }
  fs.renameSync(legacy,path.join(backup,'disabled-legacy-flexalon'));
  if(fs.existsSync(oldRootMeta)) fs.renameSync(oldRootMeta,path.join(backup,'disabled-legacy-flexalon.meta'));
} catch(err) {
  for(const [p,data] of oldExtensionMeta) fs.writeFileSync(p,data);
  console.error('[Flexalon] Migration failed; check backup and restore original project assets:',err);
  process.exit(1);
}
console.log('[Flexalon] DONE. Legacy runtime moved out of assets. UUIDs preserved in extension.');
console.log('[Flexalon] Open Creator, enable flexalon-tools, validate scenes/prefabs and builds. Keep backup.');
