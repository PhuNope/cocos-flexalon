'use strict';
/** Offline integration test executed after release ZIP is built. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {UpdateService,newer,ensureAsset}=require('../updater/service.cjs');
const {zipEntries,unzipCheckOnly,replaceTask,clearProjectCaches,waitForEditorExit,scheduleUpdaterCleanup}=require('../updater/helper.cjs');
const root=path.resolve(__dirname,'..'),pkg=require('../package.json');
const zip=path.join(root,'release','flexalon-tools-v'+pkg.version+'.zip');
const exists=p=>fs.existsSync(p);
function release(version){
 const tag='v'+version,name='flexalon-tools-'+tag+'.zip';
 return {tag_name:tag,draft:false,prerelease:false,assets:[{name,size:112933,browser_download_url:'https://github.com/PhuNope/cocos-flexalon/releases/download/'+tag+'/'+name}]};
}
async function main(){
 assert(newer('0.5.5','0.5.5-dev.1'));
 assert(!newer('0.5.4',pkg.version));
 assert(newer('0.5.4','0.5.4-beta.1'));
 assert(!newer('0.5.4-beta.1','0.5.4'));
 assert.equal(ensureAsset(release('0.5.4')).version,'0.5.4');
 // Scene ready must gate the automatic prompt, without losing an early check.
 const gateRoot=fs.mkdtempSync(path.join(os.tmpdir(),'flexalon-scene-ready-'));
 try{
  let prompts=0;
  const mockEditor={
   Project:{path:gateRoot},
   Dialog:{info:async()=>{prompts++;return {response:1};}},
   Panel:{open:async()=>{}}
  };
  const gate=new UpdateService(root,mockEditor);
  gate.release={tag:'v0.5.8',version:'0.5.8',releaseUrl:'https://github.com/PhuNope/cocos-flexalon/releases/tag/v0.5.8'};
  gate.update('available',0,'Test release available');
  await gate.maybePrompt();
  assert.equal(prompts,0,'Do not prompt while scene is loading');
  await gate.markSceneReady();
  assert.equal(prompts,1,'Prompt once when scene becomes ready');
  await gate.markSceneReady();
  assert.equal(prompts,1,'Never prompt again when scene is reopened');
  // A new session must honor the user's snooze for this release.
  const snoozed=new UpdateService(root,mockEditor);
  snoozed.release=gate.release;
  snoozed.update('available',0,'Test release available');
  await snoozed.markSceneReady();
  assert.equal(prompts,1,'Snoozed release should not prompt after restart');
  // Scene may be ready BEFORE the release query completes.
  const earlyRoot=fs.mkdtempSync(path.join(os.tmpdir(),'flexalon-ready-first-'));
  try{
   const early=new UpdateService(root,{...mockEditor,Project:{path:earlyRoot}});
   await early.markSceneReady();
   assert.equal(prompts,1,'Scene ready alone should not prompt');
   early.release=gate.release;
   early.update('available',0,'Test release available');
   await early.maybePrompt();
   assert.equal(prompts,2,'New release arriving after scene ready should prompt');
  }finally{fs.rmSync(earlyRoot,{recursive:true,force:true});}
 }finally{fs.rmSync(gateRoot,{recursive:true,force:true});}

 assert.throws(()=>ensureAsset({...release('0.5.4'),draft:true}));
 assert.throws(()=>ensureAsset({...release('0.5.4'),assets:[{name:'malware.zip',size:10,browser_download_url:'https://evil.test/a'}]}));
 assert.equal(unzipCheckOnly(zip,pkg.version),require('../scripts/release-manifest.cjs').getReleaseEntries(root).length);
 assert.throws(()=>unzipCheckOnly(zip,'99.99.99'));
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'flexalon-dev-updater-'));
 try{
  const project=path.join(temp,'project'),extension=path.join(project,'extensions','flexalon-tools');
  const work=path.join(project,'.flexalon-updater','task-good');
  fs.mkdirSync(extension,{recursive:true});fs.mkdirSync(work,{recursive:true});
  fs.writeFileSync(path.join(extension,'package.json'),JSON.stringify({name:'flexalon-tools',version:'0.5.4'}));
  fs.writeFileSync(path.join(extension,'original.marker'),'preserved');
  const zipCopy=path.join(work,'update.zip');fs.copyFileSync(zip,zipCopy);
  const stages=[];
  const done=await replaceTask({project,extension,work,zip:zipCopy,version:pkg.version},(phase)=>stages.push(phase));
  assert.equal(done.installed,pkg.version);
  assert(stages.includes('verifying')&&stages.includes('installing')&&stages.includes('installed'));
  assert(exists(path.join(work,'backup-flexalon-tools','original.marker')));
  // Tamper with compressed ZIP data, original install must remain unchanged.
  const badWork=path.join(project,'.flexalon-updater','task-bad');
  fs.mkdirSync(badWork,{recursive:true});
  const badZip=path.join(badWork,'bad.zip');fs.copyFileSync(zip,badZip);
  const bytes=fs.readFileSync(badZip);const e=zipEntries(bytes).find(x=>!x.dir&&x.compressed>5);
  bytes[e.start+2]^=0xff;fs.writeFileSync(badZip,bytes);
  await assert.rejects(replaceTask({project,extension,work:badWork,zip:badZip,version:pkg.version},()=>{}));
  assert.equal(JSON.parse(fs.readFileSync(path.join(extension,'package.json'),'utf8')).version,pkg.version);
  assert(exists(path.join(project,'.flexalon-updater')),'Failure keeps backup and logs');
  // The janitor must not be allowed to delete arbitrary folders.
  assert.throws(()=>scheduleUpdaterCleanup({project,work:path.join(project,'assets','other')}),/Refusing cleanup/);
  const folders=['assets','settings','local','build','temp','library'];
  for(const n of folders){fs.mkdirSync(path.join(project,n),{recursive:true});fs.writeFileSync(path.join(project,n,'proof.txt'),n);}
  assert.equal(await waitForEditorExit(999,20,()=>false),true);
  assert.equal(await waitForEditorExit(999,20,()=>true),false);
  const outside=path.join(temp,'outside');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'proof.txt'),'safe');
  const symlink=path.join(project,'temp');fs.rmSync(symlink,{recursive:true});
  try{
   fs.symlinkSync(outside,symlink,'dir');
   const c=clearProjectCaches(project);
   assert(c.some(x=>x.name==='temp'&&x.status==='skipped'));
   assert(exists(path.join(outside,'proof.txt')));
  }catch(e){if(!['EPERM','EACCES','ENOSYS'].includes(e.code))throw e;}
  finally{if(exists(symlink))fs.rmSync(symlink,{recursive:true,force:true});}
  for(const n of ['temp','library']){fs.mkdirSync(path.join(project,n),{recursive:true});fs.writeFileSync(path.join(project,n,'cache.dat'),'cache');}
  const result=clearProjectCaches(project);
  assert(result.every(x=>x.status==='removed'));
  assert(!exists(path.join(project,'temp'))&&!exists(path.join(project,'library')));
  for(const n of ['assets','settings','local','build'])assert.equal(fs.readFileSync(path.join(project,n,'proof.txt'),'utf8'),n);
  // Real detached worker, fake Editor: cache is removed only AFTER Editor exit.
  const worker=path.join(project,'.flexalon-updater','task-worker');
  fs.mkdirSync(worker,{recursive:true});
  const helperScript=path.join(worker,'helper.cjs'),workerZip=path.join(worker,'update.zip');
  fs.copyFileSync(path.join(root,'updater/helper.cjs'),helperScript);
  fs.copyFileSync(zip,workerZip);
  const status=path.join(worker,'status.json'),task=path.join(worker,'task.json');
  for(const n of ['temp','library']){fs.mkdirSync(path.join(project,n));fs.writeFileSync(path.join(project,n,'cache'),'stale');}
  const editor=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
  fs.writeFileSync(task,JSON.stringify({project,extension,work:worker,zip:workerZip,version:pkg.version,status,editorPid:editor.pid}));
  const messages=[];let completed=false;
  try{
   await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[helperScript,'--task',task],{stdio:['ignore','ignore','ignore','ipc']});
    child.on('message',m=>{
     messages.push(m.phase);
     if(m.phase==='waiting_for_editor_exit'){
      assert(exists(path.join(project,'temp','cache')),'Do not clear while Editor running');
      editor.kill();
     }
     if(m.phase==='complete')completed=true;
    });
    child.on('error',reject);
    child.on('exit',code=>code===0?resolve():reject(Error('Helper exit '+code)));
   });
  }finally{editor.kill();}
  assert(completed&&messages.includes('installed')&&messages.includes('waiting_for_editor_exit'));
  assert(!exists(path.join(project,'temp'))&&!exists(path.join(project,'library')));
  const workspace=path.join(project,'.flexalon-updater');
  for(let i=0;i<100&&exists(workspace);i++)await new Promise(r=>setTimeout(r,100));
  assert(!exists(workspace),'Successful update must delete ENTIRE .flexalon-updater/');
  const s=new UpdateService(extension,{Project:{path:project}});
  assert.equal(s.installed,pkg.version);
  console.log('PASS: Auto Updater ZIP, release version, CRC, rollback, Editor exit, cache cleanup, full workspace janitor');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});