'use strict';
/** Main-process updater. All requests use HTTPS and the official stable GitHub Release. */
const fs=require('node:fs');
const path=require('node:path');
const https=require('node:https');
const {spawn}=require('node:child_process');
const OWNER='PhuNope', REPO='cocos-flexalon', EXT='flexalon-tools';
const API='https://api.github.com/repos/'+OWNER+'/'+REPO+'/releases/latest';
const MAX_ZIP=60*1024*1024, HOSTS=new Set(['api.github.com','github.com','objects.githubusercontent.com','release-assets.githubusercontent.com','github-releases.githubusercontent.com']);
function vparts(value){
 const m=String(value||'').replace(/^v/,'').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
 return m?{num:[Number(m[1]),Number(m[2]),Number(m[3])],pre:m[4]||''}:null;
}
function newer(next,now){
 const a=vparts(next),b=vparts(now);if(!a||!b)return false;
 for(let i=0;i<3;i++)if(a.num[i]!==b.num[i])return a.num[i]>b.num[i];
 if(a.pre===b.pre)return false;
 if(!a.pre)return true;if(!b.pre)return false;
 const aa=a.pre.split('.'),bb=b.pre.split('.');
 for(let i=0;i<Math.max(aa.length,bb.length);i++){
  if(aa[i]===undefined)return true===false;
  if(bb[i]===undefined)return true;
  const na=/^\d+$/.test(aa[i]),nb=/^\d+$/.test(bb[i]);
  if(na&&nb&&+aa[i]!==+bb[i])return +aa[i]>+bb[i];
  if(na!==nb)return !na;
  if(aa[i]!==bb[i])return aa[i]>bb[i];
 }
 return false;
}
function ensureAsset(rel){
 if(!rel||rel.draft||rel.prerelease)throw Error('Release chưa phải bản ổn định');
 const tag=String(rel.tag_name||'');
 if(!/^v\d+\.\d+\.\d+$/.test(tag))throw Error('Release tag không hợp lệ');
 const name=EXT+'-'+tag+'.zip';
 const url='https://github.com/'+OWNER+'/'+REPO+'/releases/download/'+tag+'/'+name;
 const asset=(rel.assets||[]).find(x=>x.name===name&&x.browser_download_url===url&&x.size>0&&x.size<=MAX_ZIP);
 if(!asset)throw Error('Release không có ZIP cài đặt phù hợp');
 return {version:tag.slice(1),tag,notes:rel.body||'',url,size:asset.size,releaseUrl:'https://github.com/'+OWNER+'/'+REPO+'/releases/tag/'+tag};
}
function getHttps(url,json=false,depth=0){
 return new Promise((resolve,reject)=>{
  if(depth>6)return reject(Error('Quá nhiều HTTP redirects'));
  let u;try{u=new URL(url);}catch(e){return reject(e);}
  if(u.protocol!=='https:'||!HOSTS.has(u.hostname))return reject(Error('Host không được phép: '+u.hostname));
  const req=https.get(u,{headers:{'User-Agent':'Flexalon-Cocos-Updater/0.5.5','Accept':json?'application/vnd.github+json':'application/octet-stream'},timeout:15000},res=>{
   const code=res.statusCode||0;
   if([301,302,303,307,308].includes(code)){
    const target=res.headers.location;res.resume();
    return target?resolve(getHttps(new URL(target,u).href,json,depth+1)):reject(Error('Redirect thiếu Location'));
   }
   if(code!==200){res.resume();return reject(Error('HTTP '+code+' từ GitHub'));}
   resolve(res);
  });
  req.on('timeout',()=>req.destroy(Error('Timeout GitHub')));
  req.on('error',reject);
 });
}
async function releaseInfo(){
 const stream=await getHttps(API,true);
 let size=0;const chunks=[];
 for await(const chunk of stream){size+=chunk.length;if(size>1024*1024)throw Error('GitHub JSON quá lớn');chunks.push(chunk);}
 return ensureAsset(JSON.parse(Buffer.concat(chunks).toString('utf8')));
}
async function download(url,destination,expected,onProgress){
 const stream=await getHttps(url);
 if(Number(stream.headers['content-length']||0)>MAX_ZIP)throw Error('ZIP quá lớn');
 const file=fs.createWriteStream(destination,{flags:'wx'});
 let received=0;
 try{
  for await(const chunk of stream){
   received+=chunk.length;if(received>MAX_ZIP)throw Error('ZIP vượt giới hạn');
   if(!file.write(chunk))await new Promise(resolve=>file.once('drain',resolve));
   onProgress(received,expected);
  }
  await new Promise((resolve,reject)=>file.end(error=>error?reject(error):resolve()));
  if(received!==expected)throw Error('Download thiếu dữ liệu: '+received+'/'+expected);
 }catch(e){file.destroy();try{fs.rmSync(destination,{force:true});}catch{}throw e;}
}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
class UpdateService{
 constructor(root,editor){
  this.root=path.resolve(root);this.editor=editor;
  this.installed=JSON.parse(fs.readFileSync(path.join(this.root,'package.json'),'utf8')).version;
  this.project=editor.Project&&editor.Project.path||path.dirname(path.dirname(this.root));
  this.workRoot=path.join(this.project,'.flexalon-updater');
  this.state={phase:'idle',percent:0,installed:this.installed,latest:null,message:'Chưa kiểm tra phiên bản',downloaded:0,total:0};
  this.release=null;this.active=false;this.poll=null;this.prompted=false;this.sceneReady=false;
 }
 snapshot(){return {...this.state,latest:this.release?.version||null,releaseUrl:this.release?.releaseUrl||null};}
 update(phase,percent,message,extra={}){this.state={...this.state,phase,percent,message,...extra};}
 async check(manual=false){
  if(this.active)return this.snapshot();
  this.update('checking',0,'Đang kiểm tra GitHub Releases...');
  try{
   this.release=await releaseInfo();
   const available=newer(this.release.version,this.installed);
   this.update(available?'available':'current',0,available?'Có bản mới v'+this.release.version:'Đang dùng phiên bản mới nhất');
  }catch(e){this.update('check_error',0,'Không thể kiểm tra: '+e.message);if(manual)console.warn('[Flexalon Update]',e.message);}
  return this.snapshot();
 }
 async markSceneReady(){
  this.sceneReady=true;
  return this.maybePrompt();
 }
 async autoCheck(){
  const result=await this.check(false);
  await this.maybePrompt();
  return result;
 }
 async maybePrompt(){
  if(!this.sceneReady||this.state.phase!=='available'||this.prompted||!this.release)return this.snapshot();
  const prefs=readJson(path.join(this.workRoot,'preferences.json'))||{};
  if(prefs.snoozed===this.release.tag)return this.snapshot();
  this.prompted=true;
  try{
   const answer=await this.editor.Dialog.info('Flexalon '+this.installed+' → '+this.release.version,{
    title:'Có phiên bản Flexalon mới',
    detail:'Có thể tải và cập nhật trong Flexalon Guide.',
    buttons:['Mở Check Update','Để sau'],default:0,cancel:1
   });
   if(answer&&answer.response===0){this.openUpdateOnNext=true;await this.editor.Panel.open('flexalon-tools.guide');}
   else{fs.mkdirSync(this.workRoot,{recursive:true});fs.writeFileSync(path.join(this.workRoot,'preferences.json'),JSON.stringify({snoozed:this.release.tag}));}
  }catch(e){console.warn('[Flexalon Update] Popup không sẵn sàng',e.message);}
  return this.snapshot();
 }
 async start(){
  if(this.active)throw Error('Updater đang chạy');
  if(!this.release||!newer(this.release.version,this.installed))throw Error('Hãy Check Update trước');
  this.active=true;
  void this.perform().catch(e=>{
   this.active=false;this.update('error',0,'Cập nhật thất bại: '+e.message);
   console.error('[Flexalon Update]',e);
  });
  return this.snapshot();
 }
 async perform(){
  const project=path.resolve(this.project);
  if(this.root!==path.join(project,'extensions',EXT))throw Error('Chỉ hỗ trợ project/extensions/flexalon-tools');
  const work=path.join(this.workRoot,'task-'+Date.now()+'-'+Math.random().toString(16).slice(2,8));
  fs.mkdirSync(work,{recursive:true});
  const zip=path.join(work,'update.zip'),helper=path.join(work,'helper.cjs');
  const status=path.join(work,'status.json'),taskPath=path.join(work,'task.json');
  fs.copyFileSync(path.join(this.root,'updater','helper.cjs'),helper);
  this.update('downloading',0,'Đang tải '+this.release.tag+' từ GitHub...', {downloaded:0,total:this.release.size});
  await download(this.release.url,zip,this.release.size,(bytes,total)=>{
   this.update('downloading',Math.floor(bytes/total*100),'Đang tải '+this.release.tag+'...', {downloaded:bytes,total});
  });
  this.update('verifying',100,'Tải xong. Đang xác minh ZIP...');
  require('./helper.cjs').unzipCheckOnly(zip,this.release.version);
  const task={zip,work,status,project,extension:this.root,version:this.release.version,editorPid:process.pid};
  fs.writeFileSync(taskPath,JSON.stringify(task));
  fs.writeFileSync(path.join(this.workRoot,'active.json'),JSON.stringify({task:work,status}));
  const proc=spawn(process.execPath,[helper,'--task',taskPath],{
   cwd:work,detached:true,stdio:['ignore','ignore','ignore','ipc'],
   windowsHide:true,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}
  });
  let requested=false;
  const installed=()=>{
   if(requested)return;requested=true;
   if(this.poll){clearInterval(this.poll);this.poll=null;}
   this.active=false;
   this.update('installed',100,'Đã cài đặt. Editor sẽ đóng; sau đó Helper dọn cache và updater.');
   setTimeout(()=>{
    try{
     if(this.editor.App?.quit)this.editor.App.quit();
     else this.update('error',100,'Không thể đóng Editor tự động. Hãy lưu Scene và đóng thủ công để Helper dọn cache.');
    }catch(e){this.update('error',100,'Không thể yêu cầu đóng Editor: '+e.message);}
   },100);
  };
  proc.on('message',msg=>{if(msg?.type==='flexalon-updater'&&msg.phase==='installed')installed();});
  proc.on('error',e=>{this.active=false;this.update('error',0,'Không khởi chạy được helper: '+e.message);});
  proc.unref();proc.channel?.unref?.();
  this.update('installing',100,'Đã xác minh ZIP, đang ghi đè extension...');
  this.poll=setInterval(()=>{
   const s=readJson(status);if(!s)return;
   if(s.phase==='installed')installed();
   else if(s.phase==='error'){clearInterval(this.poll);this.poll=null;this.active=false;this.update('error',0,s.message);}
   else this.update(s.phase,s.percent||0,s.message||'');
  },100);
 }
 dispose(){if(this.poll)clearInterval(this.poll);this.poll=null;}
}
module.exports={UpdateService,newer,vparts,ensureAsset,releaseInfo,download};