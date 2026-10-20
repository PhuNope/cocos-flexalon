// Shared Flexalon Inspector renderer for Cocos Creator 3.8.x.
// Cocos ui-prop type="dump" owns property changes, including undo/redo/prefab overrides.
// No custom scene serialization and no direct mutation of dump values.
'use strict';

const layoutCommon = [
    { title: 'Layout Settings', icon: '⚙', expanded: false, fields: ['autoUpdate','includeInactive'] },
    { title: 'Scene Gizmos', icon: '◈', expanded: false, fields: ['showGizmos','showChildBounds'] },
    { title: 'Padding', icon: '▣', expanded: false, fields: ['paddingLeft','paddingRight','paddingTop','paddingBottom','paddingFront','paddingBack'] },
];

const configs = {
  FlexalonObject: {
    title: 'Flexalon Object', subtitle: 'Kích thước, khoảng cách và transform của node', kind: 'object',
    sections: [
      { title: 'Size', icon: '▦', fields: [
        'widthType','heightType','depthType',
        {key:'size',when:'anyFixed'}, {key:'fill',when:'anyFill'},
      ]},
      { title: 'Min / Max', icon: '⇳', expanded: false, fields: ['minSize','maxSize'] },
      { title: 'Margin', icon: '□', expanded: false, fields: ['marginLeft','marginRight','marginTop','marginBottom','marginFront','marginBack'] },
      { title: 'Transform', icon: '✧', expanded: false, fields: ['offset','rotationOffset','scaleMultiplier'] },
      { title: 'Fill Parent Fallback', icon: '⇱', expanded: true, when: 'anyFill', fields: ['fillParentFallback'] },
      { title: 'Advanced', icon: '⚙', expanded: false, fields: ['skipLayout','preserveUIContentSize'] },
      { title: 'Scene Gizmos', icon: '◈', expanded: false, fields: ['showGizmos'] }
    ],
    note: 'Fill Parent Fallback mặc định BẬT cho component mới khi có trục Fill và parent UITransform (kể cả Canvas). Tự bổ sung UITransform cho child nếu thiếu. Component cũ đã lưu false phải bật lại trong nhóm Fill Parent Fallback.'
  },
  FlexalonFlexibleLayout: {
    title: 'Flexible Layout', subtitle: 'Sắp xếp linh hoạt theo trục, hỗ trợ wrap', kind: 'layout',
    sections: [
      { title: 'Direction', icon: '→', fields: ['direction'] },
      { title: 'Spacing', icon: '⋮', fields: ['gap','gapOptions','wrap'] },
      { title: 'Wrap', icon: '↵', fields: ['wrapDirection','maxItemsPerLine','wrapGap','wrapAlign'], when:'wrap' },
      { title: 'Alignment', icon: '≡', fields: ['mainAlign','crossAlign'] },
      ...layoutCommon,
    ],
    note: 'Max Items Per Line = 0 không giới hạn. Nếu vùng chứa quá nhỏ, Wrap vẫn có thể xuống dòng sớm hơn.'
  },
  FlexalonGridLayout: {
    title: 'Grid Layout', subtitle: 'Lưới chữ nhật hoặc hexagon', kind: 'layout',
    sections: [
      { title: 'Grid Setup', icon: '▦', fields: ['cellType','cellSizing','columns','rows'] },
      { title: 'Placement', icon: '⊞', fields: ['startCorner','startAxis','horizontalAlign','verticalAlign'] },
      { title: 'Spacing', icon: '↔', fields: ['columnGap','rowGap'] },
      { title: 'Grid Gizmos', icon: '▦', expanded: false, fields: ['showGrid','showCellBounds','showOccupiedCells','showGridGaps','showCellIndex'] },
      ...layoutCommon,
    ],
    note: 'FitChildren tính bề rộng theo cột và chiều cao theo hàng. Hexagonal luôn dùng ô đều (Uniform).'
  },
  FlexalonCircleLayout: {
    title: 'Circle Layout', subtitle: 'Circle, ellipse, spiral, concentric rings', kind: 'layout',
    sections: [
      { title: 'Plane & Radius', icon: '◎', fields: ['plane','radiusX','radiusY','radiusType', {key:'radiusStep',when:'radiusNotConstant'}] },
      { title: 'Distribution', icon: '◌', fields: ['spacingType', {key:'spacingDegrees',when:'spacingFixed'}, {key:'arcAngle',when:'spacingEven'}, 'startAngle'] },
      { title: 'Orientation', icon: '⤴', fields: ['rotateToTangent'] },
      ...layoutCommon,
    ],
    note: 'Constant: một bán kính. Step: tăng theo từng child. Wrap: tăng sau mỗi vòng 360°.'
  },
  FlexalonAlignLayout: {
    title: 'Align Layout', subtitle: 'Căn chỉnh phần tử con theo 3 trục', kind: 'layout',
    sections: [
      {title:'Alignment',icon:'⊞',fields:['horizontalAlign','verticalAlign','depthAlign']},
      ...layoutCommon,
    ],
  },
  FlexalonCurveLayout: {
    title: 'Curve Layout', subtitle: 'Bố trí theo Bézier bậc ba', kind: 'layout',
    sections: [
      {title:'Control Points',icon:'⌁',fields:['point0','point1','point2','point3']},
      {title:'Distribution',icon:'◌',fields:['uniformDistance','orientAlongCurve']},
      ...layoutCommon,
    ],
  },
  FlexalonRandomLayout: {
    title: 'Random Layout', subtitle: 'Phân bố ngẫu nhiên có seed', kind: 'layout',
    sections: [{title:'Random Region',icon:'✦',fields:['seed','normalizedExtent']}, ...layoutCommon],
  },
  FlexalonShapeLayout: {
    title: 'Shape Layout', subtitle: 'Sắp xếp theo đường bao hình học', kind: 'layout',
    sections: [
      {title:'Shape',icon:'⬡',fields:['shape','width','height',{key:'sides',when:'polygon'},{key:'startAngle',when:'notRectangle'}]},
      ...layoutCommon,
    ],
  },
  FlexalonGridCell: {
    title: 'Grid Cell', subtitle: 'Vị trí và kích thước cell được chiếm', kind: 'component',
    sections: [{title:'Cell Override',icon:'▦',fields:['column','row','columnSpan','rowSpan']}],
    note: 'Column / Row = -1 để tự xếp; Span tối thiểu bằng 1.'
  },
  FlexalonConstraint: {
    title:'Constraint', subtitle:'Bám vị trí của một node mục tiêu', kind:'component',
    sections:[{title:'Follow',icon:'↗',fields:['target','worldOffset','followRotation']}]
  },
  FlexalonRandomModifier: {
    title:'Random Modifier',subtitle:'Nhiễu vị trí sau bước layout',kind:'component',
    sections:[{title:'Noise',icon:'✦',fields:['seed','positionRange']}]
  },
  FlexalonCloner: {
    title:'Cloner',subtitle:'Nhân bản node/prefab',kind:'component',
    sections:[{title:'Clone Settings',icon:'▤',fields:['prefab','count','rebuildOnStart','generatedPrefix']}]
  },
  FlexalonAspectRatioAdapter: {
    title:'Aspect Ratio Adapter',subtitle:'Giữ tỷ lệ UI',kind:'component',
    sections:[{title:'Aspect Ratio',icon:'▣',fields:['aspectRatio','driveHeight']}]
  },
  FlexalonCurveAnimator: {
    title:'Curve Animator',subtitle:'Bézier · Pause và Preview trong Editor',kind:'component',
    sections:[{title:'Curve',icon:'⌁',fields:['p0','p1','p2','p3']},{title:'Start Position',icon:'◎',fields:['useStartPosition',{key:'startPosition',when:'customCurveStart'},'startProgress','snapToStartInEditor','ignoreParentLayout']},{title:'Playback · Pause / Preview',icon:'▶',fields:['duration','loop','paused','previewInEditor','previewProgress']},{title:'Scene Gizmos',icon:'◈',fields:['showGizmos']}],
    note: 'Use Start Position dịch cả Bézier để P0 ở đúng Start Position (local parent). Start Progress chọn phần đường bắt đầu. Snap To Start In Editor đặt Node vào vị trí khởi đầu khi không preview. Với Layout cha, bật Ignore Parent Layout để tránh ghi đè vị trí.'
  },
  FlexalonLerpAnimator: {
    title:'Lerp Animator',subtitle:'Chuyển động mượt đến vị trí layout',kind:'component',
    sections:[{title:'Motion',icon:'➜',fields:['speed','snapDistance']}]
  },
  FlexalonDragTarget: {
    title:'Drag Target',subtitle:'Vùng nhận drag & drop',kind:'component',
    sections:[{title:'Drop',icon:'⤵',fields:['acceptDrop']},{title:'Scene Gizmos',icon:'◈',fields:['showGizmos']}]
  },
  FlexalonInteractable: {
    title:'Interactable',subtitle:'Tương tác chuột / kéo thả',kind:'component',
    sections:[{title:'Interaction',icon:'✥',fields:['dragEnabled','detachWhileDragging','keepOutsideOnRelease','reorderWithinLayout']}]
  },
  Flexalon: {
    title:'Flexalon Manager',subtitle:'Tùy chọn cập nhật hệ thống',kind:'component',
    sections:[{title:'Update',icon:'⚙',fields:['updateInEditMode','updateInPlayMode']}]
  },
};

function valueOf(dump, key) {
    const prop = dump && dump.value && dump.value[key];
    return prop && prop.value;
}
const rule = {
    wrap: (d) => valueOf(d, 'wrap') === true,
    anyFixed: (d) => ['widthType','heightType','depthType'].some((x) => Number(valueOf(d,x)) === 0),
    anyFill: (d) => ['widthType','heightType','depthType'].some((x) => Number(valueOf(d,x)) === 1),
    radiusNotConstant: (d) => Number(valueOf(d,'radiusType')) !== 0,
    spacingFixed: (d) => Number(valueOf(d,'spacingType')) === 0,
    spacingEven: (d) => Number(valueOf(d,'spacingType')) === 1,
    polygon: (d) => Number(valueOf(d,'shape')) === 2,
    notRectangle: (d) => Number(valueOf(d,'shape')) !== 0,
    customCurveStart: (d) => valueOf(d,'useStartPosition') === true,
};
const check = (name,d) => !name || !rule[name] || rule[name](d);

function escapeHtml(s) {return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function specFields(config) {
    return config.sections.flatMap((s)=>s.fields.map((f)=>typeof f==='string'?{key:f,when:null,section:s.title,sectionWhen:s.when||null}:{key:f.key,when:f.when||null,section:s.title,sectionWhen:s.when||null}));
}
function summaryOf(name, d) {
    const n = (k) => valueOf(d,k);
    const num = (k) => Number(n(k)) || 0;
    if(name==='FlexalonGridLayout') return `${num('columns')||'Auto'} cols · ${num('cellType')===1?'Hexagonal':'Rectangle'} · ${num('cellSizing')===1?'Fit Children':'Uniform'}`;
    if(name==='FlexalonFlexibleLayout') return `${n('wrap')?'Wrap on':'No wrap'} · ${num('maxItemsPerLine')||'Unlimited'} / line`;
    if(name==='FlexalonCircleLayout') return `${['Constant','Step','Wrap'][num('radiusType')]||'Constant'} radius · ${num('spacingType')===0?'Fixed':'Evenly'} spacing`;
    if(name==='FlexalonObject') return `W ${['Fixed','Fill','Component','Layout'][num('widthType')]} · H ${['Fixed','Fill','Component','Layout'][num('heightType')]}`;
    if(name==='FlexalonShapeLayout') return ['Rectangle','Ellipse','Polygon'][num('shape')]||'Shape';
    return 'Cocos Creator >= 3.8.2';
}

const style = `
:host { display:block; box-sizing:border-box; color: var(--color-normal-contrast, #ddd); }
.fl-root { font-family:inherit; padding:1px 0 6px; min-width:0; }
.fl-head { border:1px solid var(--color-border-normal, #344257); border-radius:8px; padding:12px 11px 10px; margin:4px 0 10px; background:linear-gradient(135deg, rgba(37,99,235,.17),rgba(20,184,166,.09)); }
.fl-heading { display:flex; align-items:center; gap:9px; }
.fl-mark { display:flex; align-items:center; justify-content:center; flex:none; width:34px; height:34px; border-radius:8px; background:#267d9e; color:#fff; font-size:19px; font-weight:700; }
.fl-brand { font-size:9px; letter-spacing:2px; color:#64bcd8; font-weight:750; }
.fl-title { font-size:13px; font-weight:700; margin:2px 0 0; line-height:1.2; }
.fl-subtitle { margin:8px 0 0; font-size:11px; line-height:1.5; color:var(--color-normal, #9ca3af); }
.fl-summary { margin:9px 0 0; display:inline-block; font-size:10px; color:#8adbd3; background:rgba(17,94,89,.22); padding:4px 7px; border-radius:4px; }
.fl-section { margin:6px 0; border:1px solid var(--color-border-normal, #333f4c); border-radius:7px; background:var(--color-normal-fill-emphasis, rgba(255,255,255,.025)); overflow:hidden; }
.fl-section > summary { display:flex; align-items:center; cursor:pointer; gap:8px; padding:9px 10px; user-select:none; list-style:none; font-weight:600; font-size:12px; }
.fl-section > summary::-webkit-details-marker {display:none;}
.fl-section > summary:hover { background:rgba(120,170,200,.08); }
.fl-section > summary::after {content:'›'; margin-left:auto; font-size:15px; opacity:.6; transform:rotate(0); transition:transform .15s; }
.fl-section[open] > summary::after {transform:rotate(90deg);}
.fl-icon {color:#70b8d0; font-size:15px; width:17px; text-align:center; display:inline-block; flex:none;}
.fl-content { padding:1px 9px 10px; border-top:1px solid var(--color-border-normal, rgba(255,255,255,.08)); }
.fl-row { display:block; margin-top:6px; }
.fl-row[hidden], .fl-section[hidden] { display:none !important; }
.fl-row > ui-prop { width:100%; margin:0; }
.fl-stale { border-left:3px solid #e8a657; background:rgba(197,109,48,.13); padding:10px; margin:8px 0; color:#ffd49c; font-size:11px; line-height:1.5; white-space:normal; }
.fl-stale[hidden]{display:none!important;}
.fl-hint { border-left:2px solid #218a9e; margin-top:10px; padding:7px 9px; color:var(--color-normal, #9ca3af); line-height:1.45; background:rgba(31,138,158,.06); font-size:11px; border-radius:0 5px 5px 0; }
.fl-foot { margin:11px 0 0; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.fl-version { color:var(--color-normal, #8d94a0); font-size:10px; }
.fl-refresh { border:1px solid var(--color-border-normal, #445); border-radius:5px; color:var(--color-normal-contrast, #ddd); background:rgba(70,140,167,.15); padding:5px 9px; cursor:pointer; font-size:11px; }
.fl-refresh:hover {background:rgba(70,140,167,.29);}
.fl-guide-button {border:1px solid #46687c;border-radius:5px;color:#c8e9ff;background:rgba(40,102,141,.18);padding:5px 9px;cursor:pointer;font-size:11px;margin-left:auto;}
.fl-guide-button:hover {background:rgba(40,102,141,.32);}
`;

function makeInspector(name) {
    const conf = configs[name];
    if (!conf) throw new Error('Unknown Flexalon inspector '+name);
    const fields = specFields(conf);
    const seen = new Set();
    for (const f of fields) {
        if (seen.has(f.key)) throw new Error(`Duplicate inspector field ${name}.${f.key}`);
        seen.add(f.key);
    }
    const selectors = { root:'.fl-root', summary:'.fl-summary', refresh:'.fl-refresh', guide:'.fl-guide-button', stale:'.fl-stale' };
    let sectionMarkup='';
    conf.sections.forEach((s,i)=>{
        const sectionId='section'+i;
        selectors[sectionId]='.fl-'+sectionId;
        const rows=s.fields.map((f)=>{
            const key=typeof f==='string'?f:f.key;
            selectors['row_'+key]='.fl-row-'+key;
            selectors['prop_'+key]='.fl-prop-'+key;
            return `<div class="fl-row fl-row-${key}"><ui-prop type="dump" class="fl-prop-${key}"></ui-prop></div>`;
        }).join('');
        sectionMarkup+=`<details class="fl-section fl-${sectionId}" ${s.expanded===false?'':'open'}><summary><span class="fl-icon">${escapeHtml(s.icon||'◇')}</span>${escapeHtml(s.title)}</summary><div class="fl-content">${rows}</div></details>`;
    });
    const icon=conf.kind==='object'?'◈':conf.kind==='layout'?'▦':'✧';
    const template=`<div class="fl-root"><div class="fl-head"><div class="fl-heading"><div class="fl-mark">${icon}</div><div><div class="fl-brand">FLEXALON</div><div class="fl-title">${escapeHtml(conf.title)}</div></div></div><div class="fl-subtitle">${escapeHtml(conf.subtitle)}</div><div class="fl-summary"></div></div><div class="fl-stale" hidden></div>${sectionMarkup}${conf.note?`<div class="fl-hint">${escapeHtml(conf.note)}</div>`:''}<div class="fl-foot"><span class="fl-version">Cocos · Inspector v0.5.5-dev.1</span><button type="button" class="fl-guide-button">◉ Guide</button><button type="button" class="fl-refresh">↻ Refresh Layouts</button></div></div>`;
    function refresh(thisPanel, dump) {
        if (!dump || !dump.value) return;
        if (thisPanel.$.stale) {
            const required=name==='FlexalonCurveAnimator'?
                ['paused','previewInEditor','previewProgress','showGizmos','useStartPosition','startProgress','snapToStartInEditor','ignoreParentLayout']:[];
            const missing=required.filter(k=>!dump.value[k]);
            thisPanel.$.stale.hidden=missing.length===0;
            if(missing.length)thisPanel.$.stale.textContent=
                'Editor đang dùng script Curve Animator cũ (thiếu: '+missing.join(', ')+'). '+
                'Reimport script asset-db, kiểm tra UUID trùng; khởi động lại Editor. '+
                'Thử thêm Curve Animator vào Node mới để đối chiếu.';
        }
        for (const f of fields) {
            const prop=dump.value[f.key];
            const row=thisPanel.$['row_'+f.key];
            const widget=thisPanel.$['prop_'+f.key];
            if (!row || !widget) continue;
            const displayed=!!prop && check(f.sectionWhen,dump) && check(f.when,dump);
            row.hidden = !displayed;
            if (displayed && typeof widget.render==='function') widget.render(prop);
        }
        conf.sections.forEach((section,i)=>{
            const el=thisPanel.$['section'+i];
            if (el) el.hidden=!check(section.when,dump) || !section.fields.some((f)=>{
                const key=typeof f==='string'?f:f.key;
                const row=thisPanel.$['row_'+key];
                return row && !row.hidden;
            });
        });
        if (thisPanel.$.summary) thisPanel.$.summary.textContent=summaryOf(name,dump);
    }
    return {
        template,
        style,
        $:selectors,
        update(dump){
            this._flexDump=dump;
            refresh(this,dump);
        },
        ready(){
            // If ui-prop commits, Cocos sends change-dump and calls update() with a fresh
            // dump. Do not intercept; the host owns undo/redo, prefab overrides and save.
            if (this.$.guide) this.$.guide.addEventListener('click',()=>{
                try {if (typeof Editor!=='undefined' && Editor && Editor.Panel && Editor.Panel.open) {
                    Promise.resolve(Editor.Panel.open('flexalon-tools.guide')).catch(error=>console.warn('[Flexalon Guide]', error));
                }} catch(error){console.warn('[Flexalon Guide]',error)}
            });
            if (this.$.refresh) this.$.refresh.addEventListener('click',()=>{
                try {
                    const editor=typeof Editor!=='undefined' && Editor;
                    if (editor && editor.Message && editor.Message.request) {
                        Promise.resolve(editor.Message.request('flexalon-tools','refresh-layouts'))
                            .catch((error)=>console.warn('[Flexalon Inspector] Refresh:',error));
                    }
                } catch(error){console.warn('[Flexalon Inspector] Refresh:',error);}
            });
        },
        close(){ this._flexDump=null; },
    };
}

module.exports={configs,makeInspector,specFields,valueOf,check,summaryOf};
