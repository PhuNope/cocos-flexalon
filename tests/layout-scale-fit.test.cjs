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
 constructor(){this.scale=new Vec3(1,1,1);this.position=new Vec3();this.ui=new UITransform();this.rotation=new Quat();}
 setScale(s){this.scale.set(s);}
 setPosition(p){this.position.set(p);}
 setRotation(q){this.rotation=q.clone();}
 getComponent(C){return C===UITransform?this.ui:null;}
 getComponents(){return [];}
}
const FitMode={Inherit:0,None:1,ScaleToFit:2};
const SizeType={Fixed:0,Fill:1,Component:2,Layout:3};
const dec={ccclass:()=>C=>C,property:()=>()=>{},executeInEditMode:C=>C,requireComponent:()=>C=>C};
const cc={_decorator:dec,CCObject:{Flags:{DontSave:1}},Vec3,UITransform,Quat,Node,Enum:x=>x};
class FlexalonComponent{constructor(){this.enabledInHierarchy=true;}}
class FlexalonObject{}
const t={FitMode,SizeType,Align:{Center:1},
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
console.log('PASS: Shared Scale To Fit across 7 layouts, visual Min/Max, Fit Mode override, restoring scale, intrinsic Fill size, spatial bounds and Inspector');
