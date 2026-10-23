'use strict';
/** Regression test: transpile the real runtime TypeScript and execute with Cocos UI stubs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

class Vec3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){if(typeof x==='object'){this.x=x.x;this.y=x.y;this.z=x.z;}else{this.x=x;this.y=y;this.z=z;}}
}
class FakeComponent { constructor(){this.node=null;this.enabledInHierarchy=true;} ForceUpdate(){} onEnable(){} lateUpdate(){} }
class UITransform {
  constructor(){this.width=100;this.height=100;this.anchorX=.5;this.anchorY=.5;}
  setContentSize(w,h){this.width=w;this.height=h;}
}
class FakeNode {
  constructor(parent=null){this.parent=parent;this.components=[];this.position=new Vec3(12,23,4);}
  addComponent(C){const value=new C();value.node=this;this.components.push(value);return value;}
  getComponent(C){return this.components.find(x=>x instanceof C)||null;}
  getComponents(C){return this.components.filter(x=>x instanceof C);}
  setPosition(x,y,z){this.position.set(x,y,z);}
}
const SizeType={Fixed:0,Fill:1,Component:2,Layout:3};
const dec={ccclass:()=>C=>C,property:()=>()=>{},executeInEditMode:C=>C,menu:()=>C=>C,executionOrder:()=>C=>C};
const cc={_decorator:dec,Enum:v=>v,Vec3,UITransform};
const typeStub={SizeType,Directions:class {},axisValue:(v,a)=>a===0?v.x:a===1?v.y:v.z,finitePositive:v=>Number.isFinite(v)?Math.max(0,v):0};
const gizmoStub={syncGizmosSelection(){},flexalonGizmos(){return undefined;},rect(){},boundsColor:{},marginColor:{}};
const srcFile=path.resolve(__dirname,'../assets/flexalon/Core/FlexalonObject.ts');
const output=ts.transpileModule(fs.readFileSync(srcFile,'utf8'),{fileName:srcFile,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,experimentalDecorators:true}}).outputText;
const oldLoad=Module._load;
Module._load=function(request,parent,isMain){
  if(request==='cc')return cc;
  if(request==='./FlexalonComponent')return {FlexalonComponent:FakeComponent};
  if(request==='./FlexalonTypes')return typeStub;
  if(request==='./FlexalonGizmos')return gizmoStub;
  return oldLoad.call(this,request,parent,isMain);
};
let FlexalonObject;
try {
  const m=new Module(srcFile,module);
  m.filename=srcFile;
  m.paths=Module._nodeModulePaths(path.dirname(srcFile));
  m._compile(output,srcFile);
  FlexalonObject=m.exports.FlexalonObject;
} finally {Module._load=oldLoad;}
assert.ok(FlexalonObject);
function setup(withUI=false){
  const canvas=new FakeNode();const parentUI=canvas.addComponent(UITransform);
  parentUI.width=500;parentUI.height=300;
  const child=new FakeNode(canvas);
  const childUI=withUI?child.addComponent(UITransform):null;
  const obj=child.addComponent(FlexalonObject);
  obj.widthType=SizeType.Fill;obj.heightType=SizeType.Fill;
  return {canvas,parentUI,child,childUI,obj};
}
const approx=(a,b)=>assert.ok(Math.abs(a-b)<.00001,`${a} != ${b}`);
// Canvas + child only FlexalonObject must create the missing UITransform.
{
  const {parentUI,child,obj}=setup();
  assert.equal(child.getComponent(UITransform),null);
  assert.equal(obj.fillParentFallback,true);
  obj.onEnable();
  const ui=child.getComponent(UITransform);assert.ok(ui);
  approx(ui.width,500);approx(ui.height,300);
  approx(child.position.x,0);approx(child.position.y,0);approx(child.position.z,4);
  parentUI.setContentSize(640,360);obj.lateUpdate();
  approx(ui.width,640);approx(ui.height,360);
}
// Prior serialized component with false stays opt-out until user checks the toggle.
{
  const {child,obj}=setup();obj.fillParentFallback=false;obj.onEnable();
  assert.equal(child.getComponent(UITransform),null);
  obj.fillParentFallback=true;obj.lateUpdate();
  approx(child.getComponent(UITransform).width,500);
}
// No UITransform on parent: remain a regular 3D node, no unwanted UI component.
{
  const {canvas,child,obj}=setup();
  canvas.components=[];obj.lateUpdate();
  assert.equal(child.getComponent(UITransform),null);
}
// If nothing is Fill, do not create UITransform.
{
  const {child,obj}=setup();obj.widthType=obj.heightType=SizeType.Component;obj.lateUpdate();
  assert.equal(child.getComponent(UITransform),null);
}
// Parent layout remains the source of truth.
{
  const {canvas,child,obj}=setup();
  class Layout extends FakeComponent {arrangeChildren(){} measureIntrinsic(){}}
  const layout=canvas.addComponent(Layout);
  obj.lateUpdate();assert.equal(child.getComponent(UITransform),null);
  layout.enabledInHierarchy=false;obj.lateUpdate();
  approx(child.getComponent(UITransform).width,500);
}
// Drag takes priority over fallback; it must not pull the dragged child home.
{
  const {child,obj}=setup();
  class Drag extends FakeComponent {get IsDragging(){return true;}}
  child.addComponent(Drag);obj.lateUpdate();
  assert.equal(child.getComponent(UITransform),null);
}
// Margin, anchor and offset in parent-local coordinates.
{
  const {parentUI,child,childUI:ui,obj}=setup(true);
  parentUI.anchorX=0;parentUI.anchorY=1;ui.anchorX=0;ui.anchorY=0;
  obj.marginLeft=10;obj.marginRight=20;obj.marginTop=30;obj.marginBottom=40;
  obj.offset=new Vec3(5,-6,0);obj.lateUpdate();
  approx(ui.width,470);approx(ui.height,230);
  approx(child.position.x,15);approx(child.position.y,-266);
}
// Partial Fill/Min/Max clamp with a preserved non-Fill axis.
{
  const {child,childUI:ui,obj}=setup(true);
  obj.heightType=SizeType.Component;obj.fill=new Vec3(.5,1,1);
  obj.maxSize=new Vec3(200,0,0);obj.lateUpdate();
  approx(ui.width,200);approx(ui.height,100);approx(child.position.y,23);
  obj.maxSize=new Vec3();obj.minSize=new Vec3(300,0,0);obj.lateUpdate();
  approx(ui.width,300);
}
// Preserve UITransform content size while still applying positioning.
{
  const {child,childUI:ui,obj}=setup(true);
  ui.anchorX=0;obj.preserveUIContentSize=true;obj.lateUpdate();
  approx(ui.width,100);approx(ui.height,100);approx(child.position.x,-50);
}
const inspect=require('../src/contributions/inspector/shared.js');
assert.ok(inspect.configs.FlexalonObject.sections.some(s=>s.fields.includes('fillParentFallback')));
console.log('PASS: Canvas-only child Fill, auto UITransform, resize, opt-out, layout, drag, margin/anchor, min/max, preserve');
