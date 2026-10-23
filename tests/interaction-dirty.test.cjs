'use strict';
/** Real Interactable + LayoutBase TS under mocked Cocos Node events. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Module=require('node:module'),ts=require('typescript');
const E={
 TOUCH_START:'touch-start',TOUCH_MOVE:'touch-move',TOUCH_END:'touch-end',TOUCH_CANCEL:'touch-cancel',
 CHILD_ADDED:'child-added',CHILD_REMOVED:'child-removed',CHILDREN_ORDER_CHANGED:'children-order-changed',
 SIZE_CHANGED:'size-changed',ANCHOR_CHANGED:'anchor-changed',TRANSFORM_CHANGED:'transform-changed',
 ACTIVE_CHANGED:'active-changed',ACTIVE_IN_HIERARCHY_CHANGED:'hierarchy-changed',
 COMPONENT_ADDED:'component-added',COMPONENT_REMOVED:'component-removed'
};
class Vec3 {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){if(typeof x==='object'){this.x=x.x;this.y=x.y;this.z=x.z;}else{this.x=x;this.y=y;this.z=z;}return this;}
 clone(){return new Vec3(this.x,this.y,this.z);}
 static transformMat4(out,p){out.set(p);return out;}
}
class Component{constructor(){this.node=null;this.enabledInHierarchy=true;}}
class Canvas extends Component{}
class UITransform extends Component{
 constructor(){super();this.width=600;this.height=400;this.anchorX=.5;this.anchorY=.5;}
 convertToNodeSpaceAR(p){return new Vec3(p.x,p.y,0);}
}
class Node{
 static EventType=E;static TransformBit={POSITION:1,ROTATION:2,SCALE:4};
 constructor(){this.parent=null;this.children=[];this.components=[];this.listeners=new Map();this.active=true;this.activeInHierarchy=true;this.hideFlags=0;this.position=new Vec3();this.worldMatrix={};this.worldPosition=new Vec3();this.scale=new Vec3(1,1,1);}
 addComponent(C){const c=new C();c.node=this;this.components.push(c);this.emit(E.COMPONENT_ADDED,c);return c;}
 getComponent(C){return this.components.find(c=>typeof C==='string'?typeof c.arrangeChildren==='function':c instanceof C)||null;}
 getComponents(C){return this.components.filter(c=>typeof C==='string'?typeof c.arrangeChildren==='function':c instanceof C);}
 on(type,fn,ctx){const list=this.listeners.get(type)||[];list.push({fn,ctx});this.listeners.set(type,list);}
 off(type,fn,ctx){this.listeners.set(type,(this.listeners.get(type)||[]).filter(x=>x.fn!==fn||x.ctx!==ctx));}
 emit(type,...args){for(const {fn,ctx} of [...(this.listeners.get(type)||[])])fn.apply(ctx,args);}
 addChild(n){n.setParent(this);}
 setParent(parent){if(this.parent===parent)return;const prev=this.parent;if(prev){prev.children.splice(prev.children.indexOf(this),1);prev.emit(E.CHILD_REMOVED,this);}this.parent=parent;if(parent){parent.children.push(this);parent.emit(E.CHILD_ADDED,this);}}
 getSiblingIndex(){return this.parent?this.parent.children.indexOf(this):0;}
 setSiblingIndex(i){if(!this.parent)return;const children=this.parent.children;children.splice(children.indexOf(this),1);children.splice(Math.max(0,Math.min(i,children.length)),0,this);this.parent.emit(E.CHILDREN_ORDER_CHANGED,this);}
 setWorldPosition(p){this.position.set(p);this.worldPosition.set(p);this.emit(E.TRANSFORM_CHANGED,Node.TransformBit.POSITION);}
}
const decorators={ccclass:()=>C=>C,property:()=>()=>{},executeInEditMode:C=>C,menu:()=>C=>C,requireComponent:()=>C=>C};
const cc={_decorator:decorators,Component,Node,Canvas,UITransform,Vec3,CCObject:{Flags:{DontSave:1}},Enum:x=>x,Quat:class{}};
const scriptRoot=path.resolve(__dirname,'../assets/flexalon');
function compile(relative,mocks={}){
 const file=path.join(scriptRoot,relative);
 const src=fs.readFileSync(file,'utf8');
 const output=ts.transpileModule(src,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,experimentalDecorators:true}}).outputText;
 const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));
 const native=mod.require.bind(mod);
 mod.require=name=>name==='cc'?cc:Object.hasOwn(mocks,name)?mocks[name]:native(name);
 mod._compile(output,file);return mod.exports;
}
const {FlexalonComponent}=compile('Core/FlexalonComponent.ts');
class FlexalonObject extends FlexalonComponent{constructor(){super();this.skipLayout=false;}}
class FlexalonLerpAnimator extends Component{SuspendForDrag(){this.suspended=true;}ResumeAfterDrag(){this.suspended=false;}}
class FlexalonCurveAnimator extends Component{SuspendForDrag(){this.suspended=true;}ResumeAfterDrag(){this.suspended=false;}}
class FlexalonDragTarget extends Component{}
const {LayoutBase}=compile('Core/FlexalonLayoutBase.ts',{
 './FlexalonComponent':{FlexalonComponent},
 './FlexalonObject':{FlexalonObject},
 './FlexalonResult':{FlexalonResult:class{}},
 './FlexalonLayout':{},
 './FlexalonTypes':{SizeType:{Component:2,Fixed:0,Fill:1,Layout:3}},
 './FlexalonAdapter':{defaultAdapter:{}},
 './FlexalonMath':{FlexalonMath:{}},
 './FlexalonModifier':{},
 '../Animators/FlexalonLerpAnimator':{FlexalonLerpAnimator},
 '../Animators/FlexalonCurveAnimator':{FlexalonCurveAnimator},
 '../Interaction/FlexalonInteractable':{FlexalonInteractable:class{}},
 './FlexalonGizmos':{syncGizmosSelection(){},flexalonGizmos(){},rect(){},drawLocalLineList(){},quadInParent(){}}
});
const {FlexalonInteractable}=compile('Interaction/FlexalonInteractable.ts',{
 '../Core/FlexalonComponent':{FlexalonComponent},
 '../Core/FlexalonObject':{FlexalonObject},
 '../Animators/FlexalonLerpAnimator':{FlexalonLerpAnimator},
 '../Animators/FlexalonCurveAnimator':{FlexalonCurveAnimator},
 './FlexalonDragTarget':{FlexalonDragTarget}
});
class Layout extends LayoutBase{
 constructor(){super();this.runs=0;}
 getCurrentSize(){return new Vec3(600,400,1);}
 arrangeChildren(){this.runs++;}
}
function addLayout(n){n.addComponent(UITransform);const c=n.addComponent(Layout);c.onEnable();c.lateUpdate();assert.equal(c.runs,1);return c;}
const touch=(x=0,y=0,id=1,target=null)=>({target,getUILocation:()=>({x,y}),getID:()=>id,propagationStopped:false});
function attached(parent,withObject=false){
 const n=new Node();n.addComponent(UITransform);parent.addChild(n);
 const obj=withObject?n.addComponent(FlexalonObject):null;
 const animator=n.addComponent(FlexalonLerpAnimator);
 const it=n.addComponent(FlexalonInteractable);it.onEnable();
 return {node:n,obj,it,animator};
}
// Drag without FlexalonObject: IsDragging state alone must invalidate source
// immediately; pointer position changes should not trigger relayout each frame.
{
 const parent=new Node(),layout=addLayout(parent),{node,it,animator}=attached(parent);
 layout.lateUpdate();const baseline=layout.runs;
 it.detachWhileDragging=false;it.reorderWithinLayout=false;
 it.startDrag(touch(0,0,3,node));
 assert.equal(it.IsDragging,true);
 assert.equal(layout._dirty,true,'source dirty synchronously on TOUCH_START');
 assert.equal(animator.suspended,true);
 layout.lateUpdate();assert.equal(layout.runs,baseline+1);
 for(let i=1;i<8;i++){it.moveDrag(touch(i*5,0,3,node));layout.lateUpdate();}
 assert.equal(layout.runs,baseline+1,'pointer position must not relayout continuously');
 it.endDrag(touch(0,0,3,node));
 assert.equal(it.IsDragging,false);
 assert.equal(animator.suspended,false);
 assert.equal(layout._dirty,true,'source dirty synchronously on TOUCH_END');
 layout.lateUpdate();assert.equal(layout.runs,baseline+2);
 layout.lateUpdate();assert.equal(layout.runs,baseline+2,'no redundant relayout after drop');
}
// Detached to Canvas then dropped into a different layout. Even if custom
// DropTarget bypasses Node events, both old/new layout must be invalidated.
{
 const canvas=new Node();canvas.addComponent(Canvas);
 const source=new Node(),target=new Node();canvas.addChild(source);canvas.addChild(target);
 const from=addLayout(source),to=addLayout(target);
 const {node,obj,it}=attached(source,true);
 from.lateUpdate();to.lateUpdate();
 it.startDrag(touch(0,0,4,node));assert.equal(obj.skipLayout,true);
 from.lateUpdate();from._dirty=false;to._dirty=false;
 it.moveDrag(touch(20,10,4,node));
 assert.equal(node.parent,canvas,'drag temporarily detached to Canvas');
 from._dirty=false;to._dirty=false; // isolate explicit end invalidation
 it.findDropTarget=()=>({node:target,onDrop(n){n.setParent(target);}});
 it.endDrag(touch(30,10,4,node));
 assert.equal(node.parent,target);
 assert.equal(obj.skipLayout,false);
 assert.equal(from._dirty,true,'old source must become dirty');
 assert.equal(to._dirty,true,'destination must become dirty');
 from.lateUpdate();to.lateUpdate();
 assert.equal(from._dirty,false);assert.equal(to._dirty,false);
}
// Cancel onDisable while temporarily attached to Canvas must restore parent,
// restore skipLayout and mark original layout dirty even if component disabled.
{
 const canvas=new Node();canvas.addComponent(Canvas);
 const parent=new Node();canvas.addChild(parent);
 const layout=addLayout(parent);
 const {node,obj,it,animator}=attached(parent,true);
 layout.lateUpdate();
 it.startDrag(touch(0,0,5,node));layout.lateUpdate();
 it.moveDrag(touch(22,0,5,node));assert.equal(node.parent,canvas);
 layout._dirty=false;
 it.onDisable();
 assert.equal(node.parent,parent);
 assert.equal(it.IsDragging,false);
 assert.equal(obj.skipLayout,false);
 assert.equal(animator.suspended,false);
 assert.equal(layout._dirty,true,'onDisable must invalidate original layout');
 layout.lateUpdate();
}
// Custom DropTarget throws: finally must reset internal state and dirty source.
{
 const parent=new Node(),layout=addLayout(parent),{node,obj,it}=attached(parent,true);
 layout.lateUpdate();
 it.detachWhileDragging=false;
 it.startDrag(touch(0,0,6,node));layout.lateUpdate();layout._dirty=false;
 it.moveDrag(touch(7,0,6,node));
 it.findDropTarget=()=>({node:new Node(),onDrop(){throw Error('custom target failed');}});
 assert.throws(()=>it.endDrag(touch(7,0,6,node)),/custom target failed/);
 assert.equal(it.IsDragging,false);
 assert.equal(obj.skipLayout,false);
 assert.equal(layout._dirty,true,'failed DropTarget must not leave layout stale');
}
console.log('PASS: Interactable drag start/end, Canvas reparent, drop to other layout, cancel/disable, failed custom drop, no per-frame relayout');
