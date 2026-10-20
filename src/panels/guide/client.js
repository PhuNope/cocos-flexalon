'use strict';
/** Shared offline renderer. Runs inside Cocos Editor panel without external dependencies. */
const escapeHtml = (v) => String(v == null ? '' : v).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const C = {blue:'#5bafe2',teal:'#3fc5aa',purple:'#997ce5',yellow:'#f0c76a',slate:'#2b4865'};
function rectangle(x,y,w,h,fill=C.blue,label='',stroke='',radius=10) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke||'#b5e1ff40'}" stroke-width="1.3"/>`+
      (label?`<text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" fill="#eefaff" font-weight="700" font-size="${Math.min(13,w>100?12:11)}">${escapeHtml(label)}</text>`:'');
}
function ellipse(x,y,r,fill=C.blue,label='') {
 return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#e8faff6b" stroke-width="1.1"/>${label?`<text x="${x}" y="${y+4}" text-anchor="middle" fill="#fff" font-weight="700" font-size="11">${escapeHtml(label)}</text>`:''}`;
}
function text(x,y,label,fill='#aac7dd',size=13,anchor='start') {
 return `<text x="${x}" y="${y}" fill="${fill}" text-anchor="${anchor}" font-size="${size}" font-family="Segoe UI,sans-serif">${escapeHtml(label)}</text>`;
}
function path(d,color='#9ad3f9',width=2,dash='') { return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''} stroke-linecap="round" stroke-linejoin="round"/>` }
function polygon(x,y,r,n,color=C.blue,rotation=-Math.PI/2) {
 let coords=[]; for(let i=0;i<n;i++){const a=rotation+i*Math.PI*2/n;coords.push(`${(x+r*Math.cos(a)).toFixed(2)},${(y+r*Math.sin(a)).toFixed(2)}`)}
 return `<polygon points="${coords.join(' ')}" fill="${color}" stroke="#ecfaff80" stroke-width="1.3"/>`;
}
function diagram(kind) {
 let s='';
 switch(kind) {
 case 'overview':
   s+=text(46,42,'SCENE / UI LAYOUT',C.yellow,12);
   s+=rectangle(42,62,550,155,'#1b3348','','#54708a',16);
   for(let i=0;i<3;i++)s+=rectangle(79+i*166,108,134,65,[C.blue,C.teal,C.purple][i],`Item ${i+1}`);
   s+=text(317,198,'Container • Flexible Layout', '#b3d7eb',12,'middle');break;
 case 'object':
   s+=rectangle(105,48,440,168,'#152f3c','','#68808e',15);
   s+=rectangle(171,83,310,99,C.teal,'Fixed 200 × 80');
   s+=path('M171 196 H481 M171 190 V202 M481 190 V202',C.yellow,1.6);
   s+=text(325,213,'UITransform.contentSize',C.yellow,12,'middle');
   s+=text(112,73,'Margin',C.blue,12); break;
 case 'flex':
   for(let row=0;row<3;row++){
    const n=row===2?1:3;
    for(let c=0;c<n;c++) s+=rectangle(81+c*164,30+row*76,138,59,[C.blue,C.teal,C.purple][row],`${row*3+c+1}`);
   }
   s+=text(560,51,'3 / dòng',C.yellow,12);s+=path('M562 70 V199',C.yellow,1.3,'4,4');break;
 case 'grid':
   s+=text(30,34,'RECTANGLE • FitChildren',C.yellow,11);
   s+=rectangle(58,57,252,60,C.blue,'180 × 50');
   s+=rectangle(324,76,150,39,C.teal,'60 × 20');
   s+=rectangle(163,130,50,89,C.blue,'40 × 90');
   s+=rectangle(324,155,150,50,C.teal,'120 × 30');
   s+=path('M317 48 V230', '#5c8299',1,'3,6');
   s+=text(522,151,'Cột tự đo', '#b4d6ee',12);break;
 case 'span':
   s+=text(54,35,'Grid • Columns = 3',C.yellow,12);
   s+=rectangle(57,53,324,77,C.blue,'Column Span 2');
   s+=rectangle(392,53,143,77,C.teal,'Item 2');
   for(let i=0;i<3;i++)s+=rectangle(57+i*167,140,155,72,C.slate,`Cell ${i+1}`);
   break;
 case 'circle':
   for(const r of [54,93])s+=`<circle cx="320" cy="129" r="${r}" fill="none" stroke="#52738e" stroke-dasharray="4 5" stroke-width="1.5"/>`;
   for(let i=0;i<12;i++){const a=-Math.PI/2+i*Math.PI/3;const r=i<6?54:93; s+=ellipse(320+Math.cos(a)*r,129+Math.sin(a)*r,13,i<6?C.blue:C.teal,`${i+1}`)}
   s+=ellipse(320,129,4,C.yellow); s+=text(465,73,'Radius Type',C.yellow,12);s+=text(465,94,'Wrap / Step',C.yellow,12);break;
 case 'align':
   s+=rectangle(73,45,487,169,'#172b3e','','#577795',16);
   s+=rectangle(238,91,165,93,C.slate,'Icon', '#73a0c6',14);
   s+=ellipse(403,90,26,C.yellow,'9');
   s+=path('M320 45 V215 M74 130 H559','#47627c',1,'4,6');
   s+=text(318,235,'Center + Offset',C.yellow,12,'middle');break;
 case 'curve':
 case 'curve-anim':
   s+=path('M60 181 C200 3 360 263 575 61',C.teal,3);
   s+=path('M60 181 L200 3 M360 263 L575 61','#72879a',1.2,'5,6');
   const cp=[[60,181],[200,3],[360,263],[575,61]];
   for(const [idx,p] of cp.entries())s+=ellipse(p[0],p[1],8,C.purple,`P${idx}`);
   for(let i=1;i<=5;i++){const t=i/6;const x=Math.pow(1-t,3)*60+3*Math.pow(1-t,2)*t*200+3*(1-t)*t*t*360+Math.pow(t,3)*575;
    const y=Math.pow(1-t,3)*181+3*Math.pow(1-t,2)*t*3+3*(1-t)*t*t*263+Math.pow(t,3)*61;
    s+=ellipse(x,y,13,C.blue,kind==='curve-anim'?'▶':`${i}`)}
   break;
 case 'random':
   {const pts=[[72,59],[157,163],[234,49],[302,194],[379,102],[475,176],[541,45],[242,134],[473,68]];
   s+=rectangle(35,24,560,205,'#182b3f','','#466981',14);
   pts.forEach((p,i)=>s+=ellipse(p[0],p[1],15,i%2?C.teal:C.purple,`${i+1}`));break;}
 case 'shape':
   s+=polygon(320,128,91,6,'#1b3b4a');
   for(let i=0;i<6;i++)s+=ellipse(320+91*Math.cos(-Math.PI/2+i*Math.PI/3),128+91*Math.sin(-Math.PI/2+i*Math.PI/3),14,C.blue,`${i+1}`);
   s+=text(461,127,'Polygon • 6 sides',C.yellow,12);break;
 case 'constraint':
   s+=rectangle(78,95,163,70,C.blue,'Target');s+=rectangle(391,57,163,70,C.teal,'Follower');
   s+=path('M251 128 L379 92 M368 87 L379 92 L373 104',C.yellow,3);
   s+=text(298,64,'World Offset',C.yellow,12,'middle');break;
 case 'modifier':
   for(let i=0;i<4;i++){
    const x=76+i*140;
    s+=rectangle(x,97,98,59,'#21384d','','#53758d');
    s+=path(`M${x+48} 126 l${[-13,9,-7,13][i]} ${[16,-13,14,-6][i]}`,C.yellow,2,'3,4');
    s+=rectangle(x+[-13,9,-7,13][i],97+[16,-13,14,-6][i],98,59,i%2?C.teal:C.blue,`${i+1}`);
   }break;
 case 'clone':
   s+=rectangle(40,91,133,72,C.yellow,'Prefab');
   s+=path('M177 128 H238 M230 119 L239 128 L230 137',C.yellow,2.2);
   for(let i=0;i<3;i++)s+=rectangle(264+i*113,92,98,71,i===1?C.teal:C.blue,`#${i+1}`);
   s+=text(323,188,'Count = 3',C.yellow,12,'middle');break;
 case 'ratio':
   s+=rectangle(151,42,346,170,'#2f5270','','#70a4c7',8);
   s+=rectangle(173,54,304,171,C.blue,'16 : 9');
   s+=text(322,244,'Width / Height = 1.7778',C.yellow,13,'middle');break;
 case 'anim':
   s+=rectangle(53,95,115,67,'#284058','','#477691');s+=rectangle(466,95,115,67,C.teal,'Target');
   s+=path('M175 130 H447 M437 120 L449 130 L437 140',C.yellow,2.5,'6,6');
   s+=rectangle(285,97,100,64,C.blue,'Lerp');s+=text(316,190,'Speed →',C.yellow,12,'middle');break;
 case 'drag':
   s+=rectangle(57,70,520,116,'#19354a','','#51758b',16);
   s+=rectangle(102,91,122,75,C.blue,'Drag');
   s+=rectangle(390,48,128,77,C.teal,'Item');
   s+=path('M233 129 C293 138 314 78 378 83 M365 74 L380 83 L371 97',C.yellow,3,'6,6');
   s+=text(281,211,'skipLayout during drag',C.yellow,12,'middle');break;
 case 'drop':
   s+=rectangle(78,89,141,78,C.blue,'Source');
   s+=path('M225 129 H401 M388 116 L402 129 L388 142',C.yellow,2.5,'6,6');
   s+=rectangle(415,60,141,130,'#1b3b47','Drop Zone',C.teal,12);break;
 case 'manager':
   s+=rectangle(220,27,205,61,C.purple,'Manager');
   s+=path('M322 92 V128 M144 128 H504 M144 128 V155 M322 128 V155 M504 128 V155',C.yellow,2);
   for(let i=0;i<3;i++)s+=rectangle(83+i*180,155,122,59,[C.blue,C.teal,C.blue][i],['Grid','Flexible','Circle'][i]);break;
 default:s+=rectangle(158,60,320,130,C.blue,'Flexalon');
 }
 const defs=`<defs><pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#456175" stroke-opacity=".14" stroke-width="1"/></pattern></defs>`;
 return `<svg viewBox="0 0 640 255" role="img" aria-label="Minh họa bố cục ${escapeHtml(kind)}" xmlns="http://www.w3.org/2000/svg">${defs}<rect x="0" y="0" width="640" height="255" fill="url(#g)"/>${s}</svg>`;
}
function itemHTML(d,active) {
  return `<button class="guide-item${d.id===active?' active':''}" type="button" data-guide="${escapeHtml(d.id)}" title="${escapeHtml(d.name)}"><span class="guide-item-icon">${escapeHtml(d.glyph)}</span><span class="guide-item-label">${escapeHtml(d.name)}</span></button>`;
}
function renderPage(doc,all) {
 const i=all.findIndex(v=>v.id===doc.id);
 const related=all.filter(v=>v.group===doc.group && v.id!==doc.id).slice(0,4);
 return `<article class="guide-page">
 <div class="guide-eyebrow"><span>${escapeHtml(doc.group)}</span><span class="guide-time">⏱ ${escapeHtml(doc.time)}</span><span class="guide-time">Cocos Creator >= 3.8.2</span></div>
 <h1 class="guide-h1">${escapeHtml(doc.name)}</h1><p class="guide-tagline">${escapeHtml(doc.tagline)}</p><p class="guide-intro">${escapeHtml(doc.intro)}</p>
 <figure class="guide-diagram" style="margin-left:0;margin-right:0">${diagram(doc.diagram)}<figcaption class="guide-diagram-caption">✧ Hình minh họa bố cục — không phải ảnh chụp Editor</figcaption></figure>
 <section class="guide-section"><h2 class="guide-section-head">Khi nào nên dùng?</h2><p class="guide-section-copy">${escapeHtml(doc.use)}</p></section>
 <section class="guide-section"><h2 class="guide-section-head">Cấu trúc Node mẫu</h2><div class="guide-tree-card"><div class="guide-tree-head">SCENE HIERARCHY <button type="button" class="guide-copy" data-copy="tree">⧉ Sao chép</button></div><pre class="guide-tree">${escapeHtml(doc.tree)}</pre></div></section>
 <section class="guide-section"><h2 class="guide-section-head">Hướng dẫn từng bước</h2><ol class="guide-steps">${doc.steps.map(step=>`<li>${escapeHtml(step)}</li>`).join('')}</ol></section>
 <section class="guide-section"><h2 class="guide-section-head">Các property cần biết</h2><div class="guide-table-wrap"><table class="guide-table"><thead><tr><th>Property</th><th>Ví dụ / Giá trị</th><th>Ý nghĩa</th></tr></thead><tbody>${doc.fields.map(f=>`<tr><td>${escapeHtml(f[0])}</td><td>${escapeHtml(f[1])}</td><td>${escapeHtml(f[2])}</td></tr>`).join('')}</tbody></table></div></section>
 <section class="guide-section"><h2 class="guide-section-head">Lưu ý và lỗi thường gặp</h2>${doc.tips.map(t=>`<div class="guide-note"><span class="guide-note-icon">ⓘ</span><span>${escapeHtml(t)}</span></div>`).join('')}</section>
 <section class="guide-section"><h2 class="guide-section-head">Bài tập thực hành</h2><div class="guide-challenge"><span class="guide-challenge-icon">◈</span><div>${escapeHtml(doc.task)}</div></div></section>
 ${related.length?`<section class="guide-section"><h2 class="guide-section-head">Xem thêm</h2><div class="guide-related">${related.map(x=>`<button type="button" data-guide="${escapeHtml(x.id)}">${escapeHtml(x.name)} →</button>`).join('')}</div></section>`:''}
 <div class="guide-inline-navigation"><button type="button" class="guide-nav-btn" data-guide="${escapeHtml(all[Math.max(0,i-1)].id)}" ${i===0?'disabled':''}>← ${escapeHtml(i===0?'Bài đầu tiên':all[i-1].name)}</button><button type="button" class="guide-nav-btn" data-guide="${escapeHtml(all[Math.min(all.length-1,i+1)].id)}" ${i===all.length-1?'disabled':''}>${escapeHtml(i===all.length-1?'Đã hết bài':all[i+1].name)} →</button></div>
 <footer class="guide-footer">Flexalon Cocos · Hướng dẫn offline dựa trên mã port hiện tại. Đây không phải screenshot Cocos Editor hoặc lời cam kết tương đương hoàn toàn bản Unity.</footer>
 </article>`;
}
function mount(root, docs, options={}) {
 if(!root || !Array.isArray(docs)||!docs.length)throw new Error('Flexalon Guide: invalid mount arguments');
 const store={active:options.initialId&&docs.find(x=>x.id===options.initialId)?options.initialId:docs[0].id, search:'',mode:'guide',status:null};
 const groups=[...new Set(docs.map(d=>d.group))];
 root.innerHTML=`<div class="guide-layout"><header class="guide-header"><div class="guide-brand"><div class="guide-logo">◈</div><div><div class="guide-brand-name">FLEXALON <span style="color:#87d8ff">GUIDE</span></div><div class="guide-brand-caption">Cocos Creator • Hướng dẫn thực hành</div></div></div><div class="guide-header-actions"><button class="guide-tab active" type="button" data-tab="guide">Hướng dẫn</button><button class="guide-tab" type="button" data-tab="updates">Check Update</button><span class="guide-version">...</span></div></header><div class="guide-main"><aside class="guide-sidebar"><div class="guide-search-wrap"><span class="guide-search-icon">⌕</span><input class="guide-search" type="search" placeholder="Tìm component..." aria-label="Tìm component" spellcheck="false"></div><nav class="guide-nav" aria-label="Danh sách bài hướng dẫn"></nav><div class="guide-count">19 bài · 18 component<br/>Hình minh họa · Offline</div></aside><main class="guide-content" tabindex="-1"></main></div></div>`;
 const nav=root.querySelector('.guide-nav'); const content=root.querySelector('.guide-content');const search=root.querySelector('.guide-search');
 const sidebar=root.querySelector('.guide-sidebar');
 const api=async(cmd)=>{if(typeof Editor==='undefined'||!Editor.Message?.request)throw Error('Không kết nối được Editor');return Editor.Message.request('flexalon-tools',cmd);};
 const fmt=n=>n?(n/1048576).toFixed(2)+' MB':'0 MB';
 function renderUpdate(){
   const s=store.status||{installed:'-',phase:'idle',percent:0,message:'Chưa kiểm tra cập nhật'};
   const progress=['downloading','verifying','installing','installed','waiting_for_editor_exit','clearing_cache','rolling_back','complete'].includes(s.phase);
   const doing=['downloading','verifying','installing','installed','waiting_for_editor_exit','clearing_cache','rolling_back'].includes(s.phase);
   const canUpdate=s.phase==='available';
   const percent=Math.max(0,Math.min(100,Number(s.percent)||0));
   return '<section class="update-page"><div class="guide-eyebrow">FLEXALON · AUTO UPDATER</div>'+
    '<h1 class="guide-h1">Check Update</h1><p class="guide-intro">Tải bản GitHub Release ổn định. Khi cập nhật thành công, Editor tự đóng; Helper sẽ xóa temp/, library/ và toàn bộ .flexalon-updater/ sau khi Editor thoát.</p>'+
    '<div class="update-version-grid"><div class="update-card"><span>Đang cài đặt</span><strong>v'+escapeHtml(s.installed)+'</strong></div>'+
    '<div class="update-card"><span>GitHub Release mới nhất</span><strong>'+(s.latest?'v'+escapeHtml(s.latest):'Chưa kiểm tra')+'</strong></div></div>'+
    '<div class="update-status"><div class="update-status-title">'+escapeHtml(s.message||'')+'</div>'+
    (progress?'<div class="update-progress"><div class="update-progress-fill" style="width:'+percent+'%"></div></div><div class="update-bytes">'+(s.phase==='downloading'?fmt(s.downloaded)+' / '+fmt(s.total)+' · ':'')+percent+'%</div>':'')+
    '</div><div class="update-buttons"><button type="button" class="update-btn" data-update="check" '+(doing?'disabled':'')+'>↻ Check Now</button>'+
    '<button type="button" class="update-btn primary" data-update="install" '+(!canUpdate||doing?'disabled':'')+'>⬇ Update Now</button></div>'+
    (s.releaseUrl?'<p class="update-release-url">Nguồn: '+escapeHtml(s.releaseUrl)+'</p>':'')+
    '<div class="guide-note">ⓘ Khi cập nhật thành công và Editor đã đóng, cache và backup trong .flexalon-updater/ sẽ bị xóa. Hãy sao lưu project và lưu Scene trước khi cập nhật. Nếu cập nhật lỗi, Helper sẽ rollback và giữ log.</div></section>';
 }
 function switchTab(mode){
   store.mode=mode;
   root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-tab')===mode));
   sidebar.hidden=mode==='updates';
   if(mode==='updates'){content.innerHTML=renderUpdate();content.scrollTop=0;}else navigate(store.active);
 }
 async function refreshStatus(){
   try {const s=await api('get-update-status');store.status=s;
     const version=root.querySelector('.guide-version');if(version&&s.installed)version.textContent='v'+s.installed;
     if(s.openUpdateTab&&store.mode!=='updates')switchTab('updates');
     else if(store.mode==='updates')content.innerHTML=renderUpdate();
   }catch(e){if(store.mode==='updates'){store.status={...(store.status||{}),phase:'check_error',message:e.message||String(e)};content.innerHTML=renderUpdate();}}
 }
 function showNav(){
    const q=store.search.toLowerCase().trim();const matches=d=>[d.name,d.group,d.tagline,d.intro,d.use,...d.fields.map(f=>f[0])].join(' ').toLowerCase().includes(q);
    const matchesAll=docs.filter(matches);
    nav.innerHTML=groups.map(g=>{
      const selected=matchesAll.filter(d=>d.group===g);
      return selected.length?`<div class="guide-group">${escapeHtml(g)}</div>${selected.map(d=>itemHTML(d,store.active)).join('')}`:'';
    }).join('') || '<p class="guide-empty">Không tìm thấy component phù hợp.</p>';
 }
 function navigate(id){
    const doc=docs.find(d=>d.id===id);if(!doc)return;
    store.active=id;showNav();content.innerHTML=renderPage(doc,docs);content.scrollTop=0;
 }
 const onInput=()=>{store.search=search.value;showNav()};
 const onClick=async(e)=>{
    const btn=e.target&&e.target.closest?e.target.closest('[data-guide],[data-copy],[data-tab],[data-update]'):null;
    if(!btn||!root.contains(btn)||btn.disabled)return;
    if(btn.hasAttribute('data-tab')){switchTab(btn.getAttribute('data-tab'));return;}
    if(btn.hasAttribute('data-update')){
      try{
        if(btn.getAttribute('data-update')==='check'){store.status={...(store.status||{}),phase:'checking',message:'Đang kiểm tra GitHub Releases...'};content.innerHTML=renderUpdate();store.status=await api('check-update');}
        else {
          const confirmed=typeof window==='undefined'||typeof window.confirm!=='function'||
            window.confirm('Update Now sẽ ghi đè Flexalon, đóng Cocos Creator, xóa cache temp/, library/ và toàn bộ .flexalon-updater/ gồm cả backup. Hãy lưu Scene trước. Tiếp tục?');
          if(confirmed)store.status=await api('start-update');
        }
      }catch(e){store.status={...(store.status||{}),phase:'error',message:e.message||String(e)};}
      content.innerHTML=renderUpdate();return;
    }
    if(btn.hasAttribute('data-guide')){switchTab('guide');navigate(btn.getAttribute('data-guide'));return;}
    if(btn.getAttribute('data-copy')==='tree') {
      const doc=docs.find(d=>d.id===store.active);if(!doc)return;
      try {if(typeof navigator!=='undefined'&&navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(doc.tree);
        else {const t=document.createElement('textarea');t.value=doc.tree;root.appendChild(t);t.select();document.execCommand('copy');t.remove()}
        const toast=document.createElement('div');toast.className='guide-toast';toast.textContent='Đã sao chép cấu trúc Node';root.appendChild(toast);setTimeout(()=>toast.remove(),1500);
      } catch(err){console.warn('[Flexalon Guide] Copy unavailable',err)}
    }
 };
 const onKey=(e)=>{ if(e.key==='/'&&e.target!==search&&!e.ctrlKey&&!e.metaKey){e.preventDefault();search.focus()}else if(e.key==='Escape'&&e.target===search){search.value='';onInput();search.blur()} };
 root.addEventListener('click',onClick);root.addEventListener('keydown',onKey);search.addEventListener('input',onInput);navigate(store.active);
 const poll=setInterval(()=>{void refreshStatus();},450);void refreshStatus();
 return {go:navigate,showUpdates:()=>switchTab('updates'),getState:()=>({...store}),destroy(){clearInterval(poll);search.removeEventListener('input',onInput);root.removeEventListener('click',onClick);root.removeEventListener('keydown',onKey);root.textContent=''}};
}
module.exports={mount,renderPage,diagram,escapeHtml};
