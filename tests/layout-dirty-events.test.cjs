'use strict';
/** Behavioral regression of real runtime TS with simulated Cocos 3.8 Node events. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Module=require('node:module'),ts=require('typescript');
const E={CHILD_ADDED:'child-added',CHILD_REMOVED:'child-removed',CHILDREN_ORDER_CHANGED:'sibling-order-changed',SIZE_CHANGED:'size-changed',ANCHOR_CHANGED:'anchor-changed',TRANSFORM_CHANGED:'transform-changed',ACTIVE_CHANGED:'active-changed',ACTIVE_IN_HIERARCHY_CHANGED:'active-in-hierarchy-changed',COMPONENT_ADDED:'component-added',COMPONENT_REMOVED:'component-removed'};
class Vec3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 clone(){return new Vec3(this.x,this.y,this.z);}
 set(x,y,z){Object.assign(this,typeof x==='object'?x:{x,y,z});}
}
class Component{constructor(){this.node=null;this.enabledInHierarchy=true;}}
class Node{
 static EventType=E;static TransformBit={POSITION:1,ROTATION:2,SCALE:4};
 constructor(){this.parent=null;this.children=[];this.components=[];this.listeners=new Map();this.active=true;this.activeInHierarchy=true;this.hideFlags=0;this.position=new Vec3();this.scale=new Vec3(1,1,1);}
 addComponent(C){const c=new C();c.node=this;this.components.push(c);this.emit(E.COMPONENT_ADDED,c);return c;}
 getComponent(C){return this.components.find(c=>C===undefined||typeof C==='string'||c instanceof C)||null;}
 getComponents(C){return this.components.filter(c=>C===undefined||typeof C==='string'||c instanceof C);}
 on(type,fn,context){const a=this.listeners.get(type)||[];a.push({fn,context});this.listeners.set(type,a);}
 off(type,fn,context){this.listeners.set(type,(this.listeners.get(type)||[]).filter(x=>x.fn!==fn||x.context!==context));}
 emit(type,...args){for(const {fn,context} of [...(this.listeners.get(type)||[])])fn.apply(context,args);}
 addChild(child){if(child.parent)child.parent.removeChild(child);child.parent=this;this.children.push(child);this.emit(E.CHILD_ADDED,child);}
 removeChild(child){this.children.splice(this.children.indexOf(child),1);child.parent=null;this.emit(E.CHILD_REMOVED,child);}
 moveChildFirst(child){this.children.splice(this.children.indexOf(child),1);this.children.unshift(child);this.emit(E.CHILDREN_ORDER_CHANGED);}
 setScale(x,y,z){this.scale.set(x,y,z);this.emit(E.TRANSFORM_CHANGED,Node.TransformBit.SCALE);}
 setPosition(x,y,z){this.position.set(x,y,z);this.emit(E.TRANSFORM_CHANGED,Node.TransformBit.POSITION);}
}
class UITransform{constructor(){this.width=100;this.height=100;this.anchorX=.5;this.anchorY=.5;}}
const dec={ccclass:()=>C=>C,property:()=>()=>{},executeInEditMode:C=>C,menu:()=>C=>C,requireComponent:()=>C=>C};
const cc={_decorator:dec,Node,Component,UITransform,Vec3,CCObject:{Flags:{DontSave:1}},Enum:v=>v,Quat:class{}};
const root=path.resolve(__dirname,'../assets/flexalon');
function transpile(file,mocks={}){
 const fn=path.join(root,file);
 const js=ts.transpileModule(fs.readFileSync(fn,'utf8'),{fileName:fn,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
 const mod=new Module(fn,module);mod.filename=fn;mod.paths=Module._nodeModulePaths(path.dirname(fn));const native=mod.require.bind(mod);
 mod.require=id=>id==='cc'?cc:Object.prototype.hasOwnProperty.call(mocks,id)?mocks[id]:native(id);
 mod._compile(js,fn);return mod.exports;
}
const {FlexalonComponent}=transpile('Core/FlexalonComponent.ts');
const {LayoutBase}=transpile('Core/FlexalonLayoutBase.ts',{
 './FlexalonComponent':{FlexalonComponent},'./FlexalonObject':{FlexalonObject:class{}},
 './FlexalonResult':{FlexalonResult:class{}},'./FlexalonLayout':{},
 './FlexalonTypes':{SizeType:{Component:2,Fixed:0,Fill:1,Layout:3}},
 './FlexalonAdapter':{defaultAdapter:{}},'./FlexalonMath':{FlexalonMath:{}},
 './FlexalonModifier':{},'../Animators/FlexalonLerpAnimator':{FlexalonLerpAnimator:class{}},
 '../Animators/FlexalonCurveAnimator':{FlexalonCurveAnimator:class{}},
 '../Interaction/FlexalonInteractable':{FlexalonInteractable:class{}},
 './FlexalonGizmos':{syncGizmosSelection(){},flexalonGizmos(){},rect(){},drawLocalLineList(){},quadInParent(){}}
});
const {FlexalonGridCell}=transpile('Layouts/FlexalonGridCell.ts',{'../Core/FlexalonComponent':{FlexalonComponent}});
class TestLayout extends LayoutBase{
 constructor(){super();this.gap=10;this._runs=0;}
 get runs(){return this._runs;}
 getCurrentSize(){return new Vec3(100,100,1);}
 arrangeChildren(){this._runs++;for(const c of this.node.children){c.setPosition(this.runs,0,0);c.emit(E.SIZE_CHANGED);}}
}
function create(node){const c=node.addComponent(TestLayout);c.onEnable();return c;}
{
 const parent=new Node(),a=new Node();parent.addChild(a);const layout=create(parent);
 layout.lateUpdate();assert.equal(layout.runs,1,'initial layout');
 for(let i=0;i<20;i++)layout.lateUpdate();
 assert.equal(layout.runs,1,'idle layout must be skipped');
 layout.gap=23;layout.lateUpdate();assert.equal(layout.runs,2,'Inspector edit');
 layout.lateUpdate();assert.equal(layout.runs,2);
 a.emit(E.SIZE_CHANGED);layout.lateUpdate();assert.equal(layout.runs,3,'child resized');
 a.setScale(2,2,1);layout.lateUpdate();assert.equal(layout.runs,4,'scale changed');
 a.setPosition(15,0,0);layout.lateUpdate();assert.equal(layout.runs,4,'position animation ignored');
 const b=new Node();parent.addChild(b);layout.lateUpdate();assert.equal(layout.runs,5,'child added');
 parent.moveChildFirst(b);layout.lateUpdate();assert.equal(layout.runs,6,'reordered');
 parent.removeChild(a);layout.lateUpdate();assert.equal(layout.runs,7,'child removed');
 a.emit(E.SIZE_CHANGED);layout.lateUpdate();assert.equal(layout.runs,7,'old listener removed');
 b.emit(E.ANCHOR_CHANGED);layout.lateUpdate();assert.equal(layout.runs,8,'anchor changed');
 parent.emit(E.SIZE_CHANGED);layout.lateUpdate();assert.equal(layout.runs,9,'parent resized');
 layout.ForceUpdate();assert.equal(layout.runs,10,'ForceUpdate bypasses dirty');
 layout.lateUpdate();assert.equal(layout.runs,10);
 layout.autoUpdate=false;b.emit(E.SIZE_CHANGED);layout.lateUpdate();assert.equal(layout.runs,10,'manual mode');
 layout.ForceUpdate();assert.equal(layout.runs,11,'ForceUpdate in manual mode');
 layout.onDisable();layout.enabledInHierarchy=false;
 b.emit(E.SIZE_CHANGED);assert.equal(layout._observedChildren.size,0,'listeners released');
 const second=create(parent);second.lateUpdate();
 const gridCell=b.addComponent(FlexalonGridCell);gridCell.lateUpdate();second.lateUpdate();
 const before=second.runs;
 gridCell.columnSpan=2;gridCell.lateUpdate();second.lateUpdate();
 assert.equal(second.runs,before+1,'Grid Cell Inspector property propagates');
}
{
 const rootNode=new Node(),child=new Node();rootNode.addChild(child);
 const rootLayout=create(rootNode),nested=create(child);
 rootLayout.lateUpdate();nested.lateUpdate();rootLayout.lateUpdate();
 const before=rootLayout.runs;
 nested.gap=77;nested.lateUpdate();rootLayout.lateUpdate();
 assert.equal(rootLayout.runs,before+1,'nested dirty propagation');
 rootLayout.lateUpdate();assert.equal(rootLayout.runs,before+1,'no redundant nested update');
}
console.log('PASS: Event+Dirty Layout idle skip, events, Inspector GridCell, ForceUpdate, nested and listener teardown');
