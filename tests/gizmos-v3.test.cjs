'use strict';
/** Exercise the actual optional SDK facade with a v3-shaped mock. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const file = path.resolve(__dirname, '../assets/flexalon/Core/FlexalonGizmos.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

class Canvas {}
class UITransform {}
class Color { constructor(r,g,b,a) { Object.assign(this,{r,g,b,a}); } }
class Vec2 { static ONE = {x:1,y:1}; }
class Vec3 {
  constructor(x=0,y=0,z=0) { Object.assign(this,{x,y,z}); }
  static transformMat4(out,p,m) {
    out.x=m.a*p.x+m.c*p.y+m.x;
    out.y=m.b*p.x+m.d*p.y+m.y;
    out.z=p.z; return out;
  }
}
const CCObject = {Flags:{DontSave:1,HideInHierarchy:2}};
class Node {
  constructor(name='node') {
    this.name=name; this.children=[]; this.parent=null; this.hideFlags=0; this.isValid=true;
    this.worldMatrix={a:1,b:0,c:0,d:1,x:0,y:0};
  }
  getComponent(type) { return type===Canvas && this.canvas ? this.canvas : null; }
  setParent(parent) {
    this.removeFromParent();
    this.parent=parent;
    if(parent)parent.children.push(this);
  }
  setPosition() {}
  removeFromParent() {
    if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);
    this.parent=null;
  }
  destroy() { this.isValid=false; for(const child of this.children)child.destroy(); }
}
function load(editorOnly) {
  const cc={Canvas,UITransform,CCObject,Color,Node,Vec2,Vec3};
  const exports={};
  const context=vm.createContext({exports,require(name){
    if(name==='cc')return cc;
    if(name==='cc/env')return {EDITOR_NOT_IN_PREVIEW:editorOnly};
    throw Error('Unexpected import: '+name);
  }});
  vm.runInContext(js,context);
  return {context, api:exports};
}
const {context,api}=load(true);
const canvas=new Node('Canvas'); canvas.canvas=new Canvas();
const parent=new Node('parent'); parent.setParent(canvas);
const child=new Node('child'); child.setParent(parent);
child.worldMatrix={a:0,b:2,c:-3,d:0,x:10,y:20};
const reservedNameUserNode=new Node('__FLEXALON_GIZMOS_2D__');
reservedNameUserNode.setParent(canvas);
const calls=[];
const local=new Map();
const runtime={
  endLocalPosition(n){
    local.set(n,false);
    if(!n.children.length)new Node('DEBUG_DRAW2D_NODE').setParent(n);
    calls.push(['world',n]);
  },
  beginColor(n,c){assert.equal(local.get(n),false);calls.push(['color',n,c]);},
  drawLineList(n,points,close){assert.equal(local.get(n),false);calls.push(['lines',n,points,close]);},
  drawCircle(n,p,r){assert.equal(local.get(n),false);calls.push(['circle',n,p,r]);},
  drawLabel(n,...args){assert.equal(local.get(n),false);calls.push(['label',n,...args]);},
};
assert.equal(api.flexalonGizmos(),undefined,'SDK absent is safe');
context.Gizmos2D={beginColor(){},drawLineList(){}};
assert.equal(api.flexalonGizmos(),undefined,'Incomplete SDK is safe');
context.Gizmos2D=runtime;
let selected=['child'];
context.window={Editor:{Selection:{getSelected(){return selected;}}}};
api.syncGizmosSelection(child);
assert.equal(reservedNameUserNode.isValid,true,'Never delete a user node by name');
assert.equal(calls.length,0,'Selection cleanup must not create a renderer');
const g=api.flexalonGizmos();
g.beginColor(child,api.boundsColor);
const anchor=calls.at(-1)[1];
assert.equal(anchor.parent,canvas);
assert.equal(anchor.hideFlags,3);
local.set(anchor,true); // Simulate local state from another SDK draw.
api.drawLocalLineList(g,child,[{x:2,y:3}],true);
const lines=calls.at(-1);
assert.equal(lines[1],anchor);
assert.equal(lines[2][0].x,1);
assert.equal(lines[2][0].y,24);
assert.equal(lines[3],true);
api.drawLocalLabel(g,child,'grid-child-0-0','1,1',{x:2,y:3},10);
const label=calls.at(-1);
assert.equal(label[1],anchor);
assert.equal(label[2],'grid-child-0-0');
assert.equal(label[3],'1,1');
assert.equal(label[4].x,1);
assert.equal(label[4].y,24);
assert.equal(label[5],10);
assert.equal(label[6],Vec2.ONE);
assert.equal(label[7],11);
assert.equal(label[8],22);
g.beginColor(parent,api.marginColor);
assert.equal(calls.at(-1)[1],anchor,'Nested layout uses the same stable Canvas anchor');
api.drawLocalCircle(g,child,{x:0,y:0},5);
assert.equal(calls.at(-1)[2].length,24,'Nonuniform scale is preserved by world-space polyline');
api.syncGizmosSelection(child);
assert.equal(calls.at(-1)[0],'world','Idle v3 frame queues the existing renderer');
assert.equal(anchor.isValid,true);
selected=null; api.syncGizmosSelection(child);
assert.equal(anchor.isValid,true,'Missing selection snapshot is not deselection');
selected=['parent']; api.syncGizmosSelection(parent);
assert.equal(anchor.isValid,false,'Selection transition removes old hidden anchor');
g.beginColor(parent,api.boundsColor);
const next=calls.at(-1)[1];
assert.notEqual(next,anchor);
selected=[]; api.syncGizmosSelection(parent);
assert.equal(next.isValid,false,'Clear selection removes stale drawings');
assert.equal(reservedNameUserNode.isValid,true);
delete runtime.drawLabel;
g.drawLabel(parent,'optional','label',{x:0,y:0});
assert.equal(canvas.children.length,2,'Missing optional label API does not create an anchor');
delete context.Gizmos2D;
g.beginColor(parent,api.boundsColor);
assert.equal(api.flexalonGizmos(),undefined,'SDK unload is safe');
const preview=load(false);
preview.context.Gizmos2D=runtime;
assert.equal(preview.api.flexalonGizmos(),undefined,'No SDK calls in Preview/game');
console.log('PASS: optional v3 SDK, world-space anchors, selection cleanup, idle frame and screen-sized labels.');
