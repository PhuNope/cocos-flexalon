'use strict';
/**
 * Independent installer, copied to <project>/.flexalon-updater/task-<id>/ before
 * execution. Builtin Node.js modules only. Never import the extension itself.
 */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const MAX_ARCHIVE=60*1024*1024,MAX_UNPACKED=130*1024*1024,MAX_ENTRIES=2000;
const CRC=Uint32Array.from({length:256},(_,i)=>{let n=i;for(let j=0;j<8;j++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(buf){let n=0xffffffff;for(const b of buf)n=CRC[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;}
function zipEntries(raw){
 assert.ok(raw.length>=22&&raw.length<=MAX_ARCHIVE,'Invalid ZIP size');
 const end=raw.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
 assert.ok(end>=0&&end+22<=raw.length,'ZIP central directory missing');
 const count=raw.readUInt16LE(end+10),size=raw.readUInt32LE(end+12),offset=raw.readUInt32LE(end+16);
 assert.ok(count>0&&count<=MAX_ENTRIES&&offset+size<=end,'Invalid central directory');
 const entries=[],names=new Set();let at=offset,total=0;
 for(let i=0;i<count;i++){
  assert.ok(at+46<=end&&raw.readUInt32LE(at)===0x02014b50,'Invalid central file header');
  const flags=raw.readUInt16LE(at+8),method=raw.readUInt16LE(at+10);
  const crc=raw.readUInt32LE(at+16),compressed=raw.readUInt32LE(at+20),uncompressed=raw.readUInt32LE(at+24);
  const nameLen=raw.readUInt16LE(at+28),extraLen=raw.readUInt16LE(at+30),commentLen=raw.readUInt16LE(at+32);
  const external=raw.readUInt32LE(at+38),localOffset=raw.readUInt32LE(at+42);
  assert.ok(nameLen>0&&at+46+nameLen+extraLen+commentLen<=end,'ZIP name overflow');
  const name=raw.subarray(at+46,at+46+nameLen).toString('utf8'),dir=name.endsWith('/');
  const parts=(dir?name.slice(0,-1):name).split('/');
  assert.ok(parts.length>1&&parts[0]==='flexalon-tools'&&parts.every(x=>x&&x!=='.'&&x!=='..')&&!name.includes('\\')&&!name.includes('\0'),'Unsafe ZIP filename');
  assert.ok((flags&1)===0&&(method===0||method===8),'Encrypted or unsupported ZIP entry');
  assert.ok(((external>>>16)&0xf000)!==0xa000,'ZIP symlink not allowed');
  assert.ok(!names.has(name),'Duplicate ZIP entry');names.add(name);
  total+=uncompressed;assert.ok(total<=MAX_UNPACKED,'ZIP unpacked size too large');
  assert.ok(localOffset+30<=raw.length&&raw.readUInt32LE(localOffset)===0x04034b50,'Invalid ZIP local header');
  const locNameLen=raw.readUInt16LE(localOffset+26),locExtraLen=raw.readUInt16LE(localOffset+28);
  const locName=raw.subarray(localOffset+30,localOffset+30+locNameLen).toString('utf8');
  assert.equal(locName,name,'ZIP local and central filenames differ');
  assert.equal(raw.readUInt16LE(localOffset+8),method,'ZIP compression mismatch');
  const start=localOffset+30+locNameLen+locExtraLen;
  assert.ok(start+compressed<=offset,'ZIP entry outside data area');
  entries.push({name,dir,method,crc,compressed,uncompressed,start});
  at+=46+nameLen+extraLen+commentLen;
 }
 assert.equal(at,offset+size,'ZIP directory size mismatch');
 return entries;
}
function inflate(raw,e){
 const data=e.method===0?raw.subarray(e.start,e.start+e.compressed):
  zlib.inflateRawSync(raw.subarray(e.start,e.start+e.compressed),{maxOutputLength:MAX_UNPACKED});
 assert.equal(data.length,e.uncompressed,'Uncompressed ZIP size differs: '+e.name);
 assert.equal(crc32(data),e.crc,'ZIP CRC mismatch: '+e.name);
 return data;
}
const REQUIRED=['package.json','assets/flexalon/Core/FlexalonObject.ts','dist/main.js','dist/scene.js','dist/panels/guide/client.js','static/guide-icon.png'];
function unzipCheckOnly(zip,version){
 const raw=fs.readFileSync(zip),entries=zipEntries(raw),names=new Set(entries.map(e=>e.name));
 let manifest=null;
 for(const entry of entries)if(!entry.dir){
  const data=inflate(raw,entry);
  if(entry.name==='flexalon-tools/package.json')manifest=JSON.parse(data.toString('utf8'));
 }
 for(const name of REQUIRED)assert.ok(names.has('flexalon-tools/'+name),'Missing release file: '+name);
 assert.equal(manifest?.name,'flexalon-tools','Unexpected package');
 assert.equal(manifest.version,version,'Unexpected package version');
 return entries.length;
}
function unpackVerified(zip,stage,version){
 const raw=fs.readFileSync(zip),entries=zipEntries(raw),root=path.join(stage,'flexalon-tools');
 fs.mkdirSync(root,{recursive:true});
 for(const entry of entries){
  const target=path.resolve(stage,entry.name);
  assert.ok(target===root||target.startsWith(root+path.sep),'ZIP path escape');
  if(entry.dir){fs.mkdirSync(target,{recursive:true});continue;}
  const data=inflate(raw,entry);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,data,{flag:'wx'});
 }
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 assert.equal(pkg.name,'flexalon-tools');assert.equal(pkg.version,version);
 for(const name of REQUIRED)assert.ok(fs.statSync(path.join(root,name)).isFile(),'Missing file: '+name);
 return {root,entries:entries.length};
}
function safeError(e){return String(e?.message||e).slice(0,500);}
function atomicWrite(file,obj){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(obj));fs.renameSync(tmp,file);}
async function renameWithRetry(src,dest,timeoutMs=15000){
 const until=Date.now()+timeoutMs;
 for(;;){
  try{fs.renameSync(src,dest);return;}
  catch(e){
   if(!['EPERM','EACCES','EBUSY'].includes(e?.code)||Date.now()>=until)throw e;
   // Windows Defender/indexing or an Editor child process may briefly hold a handle.
   await new Promise(resolve=>setTimeout(resolve,250));
  }
 }
}
async function replaceTask(task,emit){
 const project=path.resolve(task.project),extension=path.resolve(task.extension),work=path.resolve(task.work);
 assert.equal(extension,path.join(project,'extensions','flexalon-tools'),'Unexpected extension target');
 assert.equal(path.dirname(work),path.join(project,'.flexalon-updater'),'Task must be in project updater workspace');
 assert.ok(fs.statSync(extension).isDirectory()&&!fs.lstatSync(extension).isSymbolicLink(),'Invalid extension directory');
 assert.equal(JSON.parse(fs.readFileSync(path.join(extension,'package.json'),'utf8')).name,'flexalon-tools');
 emit('verifying',0,'Đang xác minh ZIP');
 const stage=path.join(work,'stage');fs.mkdirSync(stage,{recursive:true});
 const installed=unpackVerified(task.zip,stage,task.version);
 emit('installing',75,'Đã xác minh '+installed.entries+' file, đang ghi đè');
 const backup=path.join(work,'backup-flexalon-tools');
 assert.ok(!fs.existsSync(backup),'Existing backup; refusing overwrite');
 let oldMoved=false,newMoved=false;
 try{
  await renameWithRetry(extension,backup);oldMoved=true;
  await renameWithRetry(installed.root,extension);newMoved=true;
  assert.equal(JSON.parse(fs.readFileSync(path.join(extension,'package.json'),'utf8')).version,task.version);
  emit('installed',100,'Cập nhật thành công; đang yêu cầu Cocos Creator đóng');
  return {installed:task.version,backup};
 }catch(e){
  emit('rolling_back',70,'Lỗi cập nhật, đang khôi phục');
  if(newMoved&&fs.existsSync(extension))fs.renameSync(extension,path.join(work,'failed-new'));
  if(oldMoved&&fs.existsSync(backup))fs.renameSync(backup,extension);
  throw e;
 }
}
function running(pid){
 if(!Number.isSafeInteger(pid)||pid<=1)return false;
 try{process.kill(pid,0);return true;}catch(e){return e.code!=='ESRCH';}
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForEditorExit(pid,timeoutMs=15*60*1000,isRunning=running){
 if(!Number.isSafeInteger(pid)||pid<=1)return false;
 const limit=Date.now()+timeoutMs;
 while(isRunning(pid)){
  if(Date.now()>=limit)return false;
  await pause(Math.min(400,Math.max(1,limit-Date.now())));
 }
 await pause(1000);return true;
}
/** NEVER touch project caches until Editor PID has actually exited. */
function clearProjectCaches(project,emit=()=>{}){
 const root=path.resolve(project),names=['temp','library'],results=[];
 for(let i=0;i<names.length;i++){
  const name=names[i],target=path.join(root,name);
  assert.equal(path.dirname(target),root);
  if(!fs.existsSync(target)){results.push({name,status:'absent'});continue;}
  try{
   const stat=fs.lstatSync(target);
   if(!stat.isDirectory()||stat.isSymbolicLink()){results.push({name,status:'skipped'});continue;}
   if(fs.realpathSync(target)!==path.join(fs.realpathSync(root),name)){results.push({name,status:'skipped'});continue;}
   emit('clearing_cache',Math.floor(i/2*100),'Đang xóa cache '+name+'/');
   fs.rmSync(target,{recursive:true,force:true,maxRetries:10,retryDelay:400});
   results.push({name,status:'removed'});
  }catch(e){results.push({name,status:'error',reason:safeError(e)});}
 }
 return results;
}
/** Janitor runs outside .flexalon-updater so Windows can release Helper locks. */
function janitorMain(){
 'use strict';
 const fs=require('node:fs'),path=require('node:path');
 const project=path.resolve(process.argv[1]||''),pid=Number(process.argv[2]);
 const workspace=path.join(project,'.flexalon-updater');
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 function alive(id){if(!Number.isSafeInteger(id)||id<=1)return false;try{process.kill(id,0);return true;}catch(e){return e.code!=='ESRCH';}}
 function valid(){
  if(!fs.existsSync(workspace))return false;
  const stat=fs.lstatSync(workspace);
  if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Unsafe workspace');
  if(fs.realpathSync(workspace)!==path.join(fs.realpathSync(project),'.flexalon-updater'))throw Error('Workspace symlink');
  return true;
 }
 (async()=>{
  const deadline=Date.now()+120000;
  while(alive(pid)&&Date.now()<deadline)await wait(250);
  if(alive(pid))throw Error('Helper still running, backup preserved');
  for(let i=0;i<50;i++){
   if(!valid())return;
   try{
    fs.rmSync(workspace,{recursive:true,force:true,maxRetries:3,retryDelay:250});
    if(!fs.existsSync(workspace))return;
   }catch(e){if(i===49)throw e;}
   await wait(500);
  }
  throw Error('Cannot delete updater workspace');
 })().catch(e=>{
  try{if(valid())fs.writeFileSync(path.join(workspace,'cleanup-error.txt'),String(e?.message||e).slice(0,500));}catch{}
  process.exitCode=1;
 });
}
function scheduleUpdaterCleanup(task){
 const project=path.resolve(task.project),root=path.join(project,'.flexalon-updater'),work=path.resolve(task.work);
 assert.equal(path.dirname(work),root,'Refusing cleanup outside project updater workspace');
 const info=fs.lstatSync(root);
 assert.ok(info.isDirectory()&&!info.isSymbolicLink(),'Unsafe updater directory');
 assert.equal(fs.realpathSync(root),path.join(fs.realpathSync(project),'.flexalon-updater'),'Workspace symlink');
 const {spawn}=require('node:child_process');
 const proc=spawn(process.execPath,['-e','('+janitorMain.toString()+')()',project,String(process.pid)],{
  cwd:project,detached:true,stdio:'ignore',windowsHide:true,
  env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}
 });
 proc.on('error',e=>{try{fs.writeFileSync(path.join(root,'cleanup-error.txt'),safeError(e));}catch{}});
 if(!proc.pid)throw Error('Janitor did not start');
 proc.unref();return proc.pid;
}
async function runTask(task){
 const emit=(phase,percent,message,extra={})=>{
  atomicWrite(task.status,{phase,percent,message,...extra,updatedAt:new Date().toISOString()});
  if(process.connected&&typeof process.send==='function'){
   try{process.send({type:'flexalon-updater',phase,percent,message},()=>{});}catch{}
  }
 };
 try{
  // Never rename a live Cocos extension on Windows. First verify and stage the
  // download outside extensions/, then ask the Editor to exit via IPC.
  if(!Number.isSafeInteger(task.editorPid)||task.editorPid<=1)
   throw Error('Không xác định được Editor PID; không thể cập nhật an toàn');
  emit('verifying',0,'Đang xác minh ZIP trước khi đóng Editor');
  unzipCheckOnly(task.zip,task.version);
  emit('ready_to_close',100,'ZIP đã xác minh. Đóng Cocos Creator để ghi đè extension...');
  if(!await waitForEditorExit(task.editorPid)){
   emit('close_timeout',100,'Editor chưa đóng; chưa ghi đè extension hoặc xóa cache. ZIP được giữ lại');
   return;
  }
  // Editor process and its extension module handles have exited.
  // Only now perform the atomic backup + install + rollback transaction.
  await replaceTask(task,emit);
  const results=clearProjectCaches(task.project,emit);
  const issues=results.filter(x=>x.status==='error'||x.status==='skipped');
  if(issues.length){emit('cache_warning',100,'Không xóa được cache: '+issues.map(x=>x.name).join(', '),{cache:results});return;}
  try{
   const janitorPid=scheduleUpdaterCleanup(task);
   emit('complete',100,'Đã cập nhật và xóa cache. Đang xóa toàn bộ .flexalon-updater/',{cache:results,janitorPid});
  }catch(e){emit('cleanup_pending',100,'Không khởi chạy được janitor: '+safeError(e),{cache:results});}
 }catch(e){emit('error',0,safeError(e));process.exitCode=1;}
}
if(require.main===module){
 const i=process.argv.indexOf('--task');
 if(i<0||!process.argv[i+1]){console.error('Usage: helper.cjs --task /abs/task.json');process.exit(2);}
 else runTask(JSON.parse(fs.readFileSync(process.argv[i+1],'utf8')));
}
module.exports={crc32,zipEntries,unzipCheckOnly,unpackVerified,replaceTask,clearProjectCaches,waitForEditorExit,running,scheduleUpdaterCleanup,runTask};