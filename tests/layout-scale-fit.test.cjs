'use strict';
/** Behavioral + wiring regression for shared fit across every Flexalon layout. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Module=require('node:module'),ts=require('typescript');
class Vec3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 clone(){return new Vec3(this.x,this.y,this.z);}
 set(x,y,z){if(typeof x==='object')Object.assign(this,x);else Object.assign(this,{x,y,z});return this;}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
}
class Quat{
 constructor(){this.x=0;this.y=0;this.z=0;this.w=1;}
 clone(){return Object.assign(new Quat(),this);}
 static fromEuler(out,x,y,z){out.x=x;out.y=y;out.z=z;return out;}
 static equals(a,b){return a.x===b.x&&a.y===b.y&&a.z===b.z;}
}
class UITransform{
 constructor(w=200,h=100){this.width=w;this.height=h;this.anchorX=.5;this.anchorY=.5;}
 setContentSize(w,h){this.width=w;this.height=h;}
}
class Node{
 static EventType={CHILD_ADDED:'child-added',CHILD_REMOVED:'child-removed',
     CHILDREN_ORDER_CHANGED:'children-order',SIZE_CHANGED:'size',
     ANCHOR_CHANGED:'anchor',TRANSFORM_CHANGED:'transform',
     ACTIVE_CHANGED:'active',ACTIVE_IN_HIERARCHY_CHANGED:'active-hierarchy',
     COMPONENT_ADDED:'component-added',COMPONENT_REMOVED:'component-removed'};
 static TransformBit={SCALE:4,ROTATION:2,POSITION:1};
 constructor(){this.scale=new Vec3(1,1,1);this.position=new Vec3();this.ui=new UITransform();this.rotation=new Quat();
   this.layoutObject=null;this.children=[];this.active=true;this.activeInHierarchy=true;this.hideFlags=0;this.parent=null;
   this.layouts=[];this.listeners=new Map();}
 setScale(s){this.scale.set(s);this.emit(Node.EventType.TRANSFORM_CHANGED,Node.TransformBit.SCALE);}
 setPosition(p){this.position.set(p);this.emit(Node.EventType.TRANSFORM_CHANGED,Node.TransformBit.POSITION);}
 setRotation(q){this.rotation=q.clone();}
 on(type,fn,ctx){const list=this.listeners.get(type)||[];list.push([fn,ctx]);this.listeners.set(type,list);}
 off(type,fn,ctx){this.listeners.set(type,(this.listeners.get(type)||[]).filter(v=>v[0]!==fn||v[1]!==ctx));}
 emit(type,...args){for(const [fn,ctx] of [...(this.listeners.get(type)||[])])fn.apply(ctx,args);}
 getComponent(C){return C===UITransform?this.ui:C===FlexalonObject?this.layoutObject:null;}
 getComponents(C){return typeof C==='string'?[]:this.layouts.filter(l=>l instanceof C);}
}
const FitMode={Inherit:0,None:1,ScaleToFit:2};
const SizeType={Fixed:0,Fill:1,Component:2,Layout:3};
const dec={ccclass:()=>C=>C,property:()=>()=>{},menu:()=>C=>C,executeInEditMode:C=>C,requireComponent:()=>C=>C};
const cc={_decorator:dec,CCObject:{Flags:{DontSave:1}},Vec3,UITransform,Quat,Node,
 Color:class {constructor(){}},Enum:x=>x};
class FlexalonComponent{
 constructor(){this.enabledInHierarchy=true;this._dirty=true;}
 onEnable(){}
 onDisable(){}
 MarkDirty(){this._dirty=true;}
}
class FlexalonObject{
 constructor(widthType=SizeType.Component,heightType=SizeType.Component){
   this.widthType=widthType;this.heightType=heightType;this.depthType=SizeType.Component;
   this.size=v(100,100,1);this.minSize=v();this.maxSize=v();
   this.scaleMultiplier=v(1,1,1);this.fitMode=FitMode.None;this.offset=v();this.rotationOffset=v();
   this.marginLeft=0;this.marginRight=0;this.marginTop=0;this.marginBottom=0;this.marginFront=0;this.marginBack=0;
   this.fill=v(1,1,1);this.preserveUIContentSize=false;
 }
 typeForAxis(a){return a===0?this.widthType:a===1?this.heightType:this.depthType;}
 fixed(a){return a===0?this.size.x:a===1?this.size.y:this.size.z;}
 clampSize(a,val){
   const min=a===0?this.minSize.x:a===1?this.minSize.y:this.minSize.z;
   const max=a===0?this.maxSize.x:a===1?this.maxSize.y:this.maxSize.z;
   return Math.max(min,max>0?Math.min(max,val):val);
 }
 fraction(a){return a===0?this.fill.x:a===1?this.fill.y:this.fill.z;}
 GetFitSourceSize(){return 0;}
 SyncFixedUIContentSize(){}
}
const t={FitMode,SizeType,Align:{Start:0,Center:1,End:2},
 GridCellType:{Rectangle:0,Hexagonal:1},
 GridCellSizing:{Uniform:0,FitChildren:1},
 GridCorner:{BottomLeft:0,BottomRight:1,TopRight:2,TopLeft:3},
 Axis:{x:0,y:1,z:2},
 Direction:{PositiveX:0,NegativeX:1,PositiveY:2,NegativeY:3,PositiveZ:4,NegativeZ:5},
 GapOptions:{Fixed:0,SpaceBetween:1,SpaceAround:2,SpaceEvenly:3},
 axisIndex:direction=>Math.floor(direction/2),
 axisSign:direction=>direction%2===0?1:-1,
 axisValue:(v,i)=>i===0?v.x:i===1?v.y:v.z,
 setAxis:(v,i,val)=>{if(i===0)v.x=val;else if(i===1)v.y=val;else v.z=val;},
 align01:a=>a===0?0:a===2?1:.5};
const baseFile=path.resolve(__dirname,'../assets/flexalon/Core/FlexalonLayoutBase.ts');
const output=ts.transpileModule(fs.readFileSync(baseFile,'utf8'),{fileName:baseFile,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,experimentalDecorators:true}}).outputText;
const mod=new Module(baseFile,module);mod.filename=baseFile;mod.paths=Module._nodeModulePaths(path.dirname(baseFile));
const original=mod.require.bind(mod);
const dummy=class {};
const mocks={
 cc,
 './FlexalonComponent':{FlexalonComponent},'./FlexalonObject':{FlexalonObject},
 './FlexalonResult':{FlexalonResult:dummy},'./FlexalonTypes':t,
 './FlexalonAdapter':{defaultAdapter:{measure:n=>new Vec3(n.ui.width,n.ui.height,1)}},
 './FlexalonMath':{FlexalonMath:{VecApproximately:(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.z-b.z)<1e-6}},
 '../Animators/FlexalonLerpAnimator':{FlexalonLerpAnimator:dummy},
 '../Animators/FlexalonCurveAnimator':{FlexalonCurveAnimator:dummy},
 '../Interaction/FlexalonInteractable':{FlexalonInteractable:dummy},
 './FlexalonGizmos':{}
};
mod.require=name=>Object.hasOwn(mocks,name)?mocks[name]:original(name);
mod._compile(output,baseFile);
const {LayoutBase,calculateFitScale}=mod.exports;
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);
const v=(x=0,y=0,z=0)=>new Vec3(x,y,z);
const min=v(60,30),max=v(120,80);
approx(calculateFitScale(v(200,100),v(1,1,1),100,100,v(),v()),.5);
approx(calculateFitScale(v(60,40),v(1,1,1),90,90,v(),v()),1.5);
approx(calculateFitScale(v(200,100),v(1,1,1),40,40,min,max),.3);
approx(calculateFitScale(v(200,100),v(1,1,1),300,300,v(),max),.6);
approx(calculateFitScale(v(200,100),v(2,.5,1),100,100,v(),v()),.25);
const layout=new LayoutBase();layout.node=new Node();layout.fitChildren=true;
const node=new Node(),ui=node.ui;
const o={fitMode:FitMode.Inherit,minSize:v(),maxSize:v(),
 widthType:SizeType.Fill,heightType:SizeType.Fill,
 scaleMultiplier:v(1,1,1),offset:v(),rotationOffset:v(),
 GetFitSourceSize:()=>0};
const item={node,object:o,size:v(200,100,1),outer:v(200,100,1),
 marginLeft:0,marginRight:0,marginTop:0,marginBottom:0,marginFront:0,marginBack:0};
assert.equal(layout.shouldFit(item),true);
o.fitMode=FitMode.None;assert.equal(layout.shouldFit(item),false);
o.fitMode=FitMode.ScaleToFit;layout.fitChildren=false;assert.equal(layout.shouldFit(item),true);
let fit=layout.fitItem(item,v(100,100,1),v(100,100,1));
approx(fit.scale,.5);
layout.place(item,v(),v(100,100,1),0,null,fit);
approx(node.scale.x,.5);approx(node.scale.y,.5);
approx(ui.width,200);approx(ui.height,100);
fit=layout.fitItem(item,v(100,100,1),v(100,100,1));
layout.place(item,v(),v(100,100,1),0,null,fit);
approx(node.scale.x,.5); // repeated layout must not accumulate scale
o.minSize=v(60,30);o.maxSize=v(120,80);
fit=layout.fitItem(item,v(40,40,1),v(40,40,1));
approx(fit.scale,.3);approx(fit.visualSize.x,60);
layout.place(item,v(),v(40,40,1),0,null,fit);approx(node.scale.x,.3);
layout.place(item,v(),v(100,100,1),0,null,undefined);approx(node.scale.x,1);
o.minSize=v();o.maxSize=v();
o.GetFitSourceSize=axis=>axis===0?300:axis===1?150:0;
ui.setContentSize(100,100);
fit=layout.fitItem(item,v(150,150,1),v(150,150,1));
approx(ui.width,300);approx(ui.height,150);approx(fit.scale,.5);
const spatial=layout.spatialFitBounds(item,v(1000,1000,1));
approx(spatial.x,300);approx(spatial.y,150);
layout.fitItemSize=v(90,60,0);
const limited=layout.spatialFitBounds(item,v(1000,1000,1));
approx(limited.x,90);approx(limited.y,60);
// Every concrete layout must call the same shared fit method.
const layouts=['Grid','Flexible','Align','Circle','Curve','Shape','Random'];
for(const name of layouts){
 const source=fs.readFileSync(path.join(__dirname,'../assets/flexalon/Layouts/Flexalon'+name+'Layout.ts'),'utf8');
 assert.ok(source.includes('this.fitItem('),name+' does not use shared Fit');
 assert.ok(source.includes('this.shouldFit('),name+' does not honor child override');
}
const inspector=fs.readFileSync(path.join(__dirname,'../src/contributions/inspector/shared.js'),'utf8');
for(const property of ['fitMode','fitSourceSize','fitChildren','fitPadding','fitItemSize'])
 assert.ok(inspector.includes("'"+property+"'"),'Missing Inspector field '+property);

// FlexibleLayout: Width/Height=Layout must measure POST-FIT visual size, not stale UITransform.
const flexibleFile=path.resolve(__dirname,'../assets/flexalon/Layouts/FlexalonFlexibleLayout.ts');
const flexibleJS=ts.transpileModule(fs.readFileSync(flexibleFile,'utf8'),{
 fileName:flexibleFile,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,experimentalDecorators:true}
}).outputText;
const flexModule=new Module(flexibleFile,module);flexModule.filename=flexibleFile;
flexModule.paths=Module._nodeModulePaths(path.dirname(flexibleFile));
const flexNative=flexModule.require.bind(flexModule);
const flexMocks={
 cc,
 '../Core/FlexalonObject':{FlexalonObject},
 '../Core/FlexalonLayoutBase':{LayoutBase,calculateFitScale},
 '../Core/FlexalonTypes':t
};
flexModule.require=name=>Object.hasOwn(flexMocks,name)?flexMocks[name]:flexNative(name);
flexModule._compile(flexibleJS,flexibleFile);
const {FlexalonFlexibleLayout}=flexModule.exports;
function createFlex({
 widthType=SizeType.Layout,heightType=SizeType.Layout,
 parentWidth=42,parentHeight=55,ownerMax=v(),fitItemSize=v(),wrap=false,maxItemsPerLine=0,
 childWidth=500,childHeight=100,childMax=v(),childMin=v()
}={}){
 const parent=new Node();
 parent.ui.setContentSize(parentWidth,parentHeight);
 parent.layoutObject=new FlexalonObject(widthType,heightType);
 parent.layoutObject.size=v(600,100,1);
 parent.layoutObject.maxSize=ownerMax;
 const layout=new FlexalonFlexibleLayout();
 layout.node=parent;layout.gap=10;layout.wrapGap=10;
 layout.fitChildren=false;layout.fitItemSize=fitItemSize;layout.wrap=wrap;
 layout.maxItemsPerLine=maxItemsPerLine;
 function add(width,height,fitMode=FitMode.None){
   const child=new Node();child.ui.setContentSize(width,height);
   child.layoutObject=new FlexalonObject(fitMode===FitMode.ScaleToFit?SizeType.Fill:SizeType.Component,
     fitMode===FitMode.ScaleToFit?SizeType.Fill:SizeType.Component);
   child.layoutObject.fitMode=fitMode;
   if(fitMode===FitMode.ScaleToFit){child.layoutObject.maxSize=childMax;child.layoutObject.minSize=childMin;}
   child.parent=parent;parent.children.push(child);
   return child;
 }
 const A=add(100,100),B=add(200,100),C=add(childWidth,childHeight,FitMode.ScaleToFit);
 const update=()=>layout.ForceUpdate();
 return {parent,layout,A,B,C,update};
}
{
 const f=createFlex();
 f.update();
 approx(f.parent.ui.width,820);approx(f.parent.ui.height,100);
 approx(f.C.scale.x,1);approx(f.C.ui.width,500);
 f.update();approx(f.parent.ui.width,820);approx(f.C.scale.x,1); // no feedback drift
}
{
 const f=createFlex({fitItemSize:v(280,0)});
 f.update();
 approx(f.parent.ui.width,600);approx(f.parent.ui.height,100);
 approx(f.C.scale.x,.56);approx(f.C.ui.width,500);
 f.update();approx(f.parent.ui.width,600);approx(f.C.scale.x,.56);
}
{
 const f=createFlex({childMax:v(280,0)});
 f.update();approx(f.parent.ui.width,600);approx(f.C.scale.x,.56);
}
{
 // Parent Layout width, Fixed height: constrained Y determines visual X.
 const f=createFlex({heightType:SizeType.Fixed,childHeight:200});
 f.update();
 approx(f.parent.ui.width,570);approx(f.C.scale.x,.5);
 approx(f.parent.ui.height,55); // Fixed axis is calculated but contentSize is unchanged without Fixed UI sync mock
 f.update();approx(f.parent.ui.width,570);
}
{
 // Parent Fixed width, Layout height: C receives leftover width after A+B+gaps.
 const f=createFlex({widthType:SizeType.Fixed});
 f.update();
 approx(f.parent.ui.height,100);approx(f.C.scale.x,.56);
 approx(f.A.scale.x,1);approx(f.B.scale.x,1);
 f.update();approx(f.C.scale.x,.56);approx(f.parent.ui.height,100);
}
{
 // Parent max bounds act as external limit even when parent axis = Layout.
 const f=createFlex({ownerMax:v(600,0)});
 f.update();approx(f.parent.ui.width,600);approx(f.C.scale.x,.56);
}
{
 const f=createFlex({fitItemSize:v(280,0),wrap:true,maxItemsPerLine:2});
 f.update();
 approx(f.parent.ui.width,310);approx(f.parent.ui.height,166);
 approx(f.C.scale.x,.56);
}
{
 // Child minimum remains authoritative even if the remaining slot cannot fit it.
 const f=createFlex({widthType:SizeType.Fixed,childMin:v(400,0)});
 f.update();approx(f.C.scale.x,.8); // visual width 400 > available 280
 f.update();approx(f.C.scale.x,.8);
}
{
 // No-fit legacy Flexible Layout must preserve size, Fill behavior and avoid stale references.
 const f=createFlex({widthType:SizeType.Fixed});
 f.C.layoutObject.fitMode=FitMode.None;
 f.C.layoutObject.widthType=SizeType.Component;
 f.C.layoutObject.heightType=SizeType.Component;
 f.update();
 approx(f.C.scale.x,1);
 approx(f.C.ui.width,500);
 approx(f.parent.ui.height,100);
}
{
 const f=createFlex({widthType:SizeType.Fixed});
 f.C.layoutObject.fitMode=FitMode.None;
 f.C.layoutObject.widthType=SizeType.Fill;
 f.C.layoutObject.heightType=SizeType.Component;
 f.update();
 approx(f.C.scale.x,1);
 approx(f.C.ui.width,280);
 f.update();approx(f.C.ui.width,280);
}


/** Regression: Flexible Fit -> Grid no Fit, without removing any component. */
const gridPath=path.resolve(__dirname,'../assets/flexalon/Layouts/FlexalonGridLayout.ts');
const gridJS=ts.transpileModule(fs.readFileSync(gridPath,'utf8'),{
 fileName:gridPath,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,experimentalDecorators:true}
}).outputText;
const gridMod=new Module(gridPath,module);gridMod.filename=gridPath;
gridMod.paths=Module._nodeModulePaths(path.dirname(gridPath));
const gridNative=gridMod.require.bind(gridMod);
gridMod.require=name=>{
 const m={
  cc,'../Core/FlexalonObject':{FlexalonObject},
  '../Core/FlexalonLayoutBase':{LayoutBase,calculateFitScale},
  '../Core/FlexalonTypes':t,
  './FlexalonGridCell':{FlexalonGridCell:class{}},
  '../Core/FlexalonGizmos':{}
 };
 return Object.hasOwn(m,name)?m[name]:gridNative(name);
};
gridMod._compile(gridJS,gridPath);
const {FlexalonGridLayout}=gridMod.exports;
function switchScene(){
 const parent=new Node();parent.ui.setContentSize(117.5,108);
 parent.layoutObject=new FlexalonObject(SizeType.Fixed,SizeType.Fixed);
 parent.layoutObject.size=v(117.5,108,1);
 const item=new Node();item.parent=parent;parent.children.push(item);
 item.ui.setContentSize(40,36);
 item.layoutObject=new FlexalonObject(SizeType.Fill,SizeType.Fill);
 item.layoutObject.fitMode=FitMode.Inherit;
 item.layoutObject.CaptureFitSourceSize=()=>{};
 const flexible=new FlexalonFlexibleLayout();flexible.node=parent;
 flexible.fitChildren=true;flexible.gap=0;flexible.wrapGap=0;
 const grid=new FlexalonGridLayout();grid.node=parent;
 grid.fitChildren=false;grid.cellPadding=0;
 grid.columns=1;grid.rows=1;grid.columnGap=0;grid.rowGap=0;
 parent.layouts=[flexible];
 flexible.onEnable();
 return {parent,item,flexible,grid};
}
{
 const {parent,item,flexible,grid}=switchScene();
 flexible.ForceUpdate();
 approx(item.scale.x,2.9375);
 approx(item.ui.width,40);approx(item.ui.height,36);
 // Add a Grid without removing Flexible: last enabled component owns the child.
 parent.layouts.push(grid);grid.onEnable();grid.ForceUpdate();
 approx(item.scale.x,1);
 approx(item.ui.width,117.5);approx(item.ui.height,108);
 flexible.ForceUpdate();approx(item.scale.x,1); // old active layout cannot write
 // Grid Fill without Fit deliberately fills its CELL, not the editable source UI.
 // With preserveUIContentSize enabled, a user can edit 40 x 36 while keeping Fill.
 item.layoutObject.preserveUIContentSize=true;
 item.ui.setContentSize(40,36);
 item.emit(Node.EventType.SIZE_CHANGED);
 grid.ForceUpdate();
 approx(item.ui.width,40);approx(item.ui.height,36);approx(item.scale.x,1);
 item.setScale(v(1.1,1.1,1)); // external Inspector edit becomes new baseline
 grid.ForceUpdate();approx(item.scale.x,1.1);
 item.setScale(v(1,1,1));grid.ForceUpdate();approx(item.scale.x,1);
 // Disable Grid: cache released even though the component remains attached.
 grid.enabledInHierarchy=false;grid.onDisable();
 approx(item.scale.x,1);approx(item.ui.width,40);
 // Disable old Flexible as well; keep authored content and scale.
 flexible.enabledInHierarchy=false;flexible.onDisable();
 approx(item.scale.x,1);approx(item.ui.height,36);
 // Re-enable Grid alone: no stale 2.9375 baseline.
 grid.enabledInHierarchy=true;grid.onEnable();grid.ForceUpdate();
 approx(item.scale.x,1);approx(item.ui.width,40);approx(item.ui.height,36);
 grid.enabledInHierarchy=false;grid.onDisable();
}
{
 const {parent,item,flexible,grid}=switchScene();
 flexible.ForceUpdate();approx(item.scale.x,2.9375);
 flexible.enabledInHierarchy=false;flexible.onDisable();
 approx(item.scale.x,1); // disable immediately restores scale, without component removal
 approx(item.ui.width,40);
 parent.layouts.push(grid);
 grid.onEnable();grid.ForceUpdate();approx(item.scale.x,1);
 grid.enabledInHierarchy=false;grid.onDisable();
 approx(item.ui.width,40);
}
{
 // Flexible Fill wrote 117.5 x 108; switching to Grid Component must restore
 // 40 x 36 BEFORE Grid measures its item, not merely after placing it.
 const {parent,item,flexible,grid}=switchScene();
 flexible.fitChildren=false;
 flexible.ForceUpdate();
 approx(item.ui.width,117.5);approx(item.ui.height,108);
 item.layoutObject.widthType=SizeType.Component;
 item.layoutObject.heightType=SizeType.Component;
 parent.layouts.push(grid);grid.onEnable();grid.ForceUpdate();
 approx(item.ui.width,40);approx(item.ui.height,36);approx(item.scale.x,1);
 grid.enabledInHierarchy=false;grid.onDisable();
 flexible.enabledInHierarchy=false;flexible.onDisable();
}
{
 // User can resize manually when the axis uses Component rather than Fill.
 const {parent,item,flexible,grid}=switchScene();
 flexible.enabledInHierarchy=false;flexible.onDisable();
 parent.layouts.push(grid);grid.onEnable();grid.ForceUpdate();
 item.layoutObject.widthType=SizeType.Component;
 item.layoutObject.heightType=SizeType.Component;
 item.ui.setContentSize(40,36);item.emit(Node.EventType.SIZE_CHANGED);
 grid.ForceUpdate();approx(item.ui.width,40);approx(item.ui.height,36);
 approx(item.scale.x,1);
 grid.enabledInHierarchy=false;grid.onDisable();
}

console.log('PASS: Shared Scale To Fit across 7 layouts, Flexible Layout intrinsic size and remaining-space allocation, visual Min/Max, Fit Mode override and no feedback');
