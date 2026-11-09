'use strict';
/** Behavioral tests of actual Grid TS with lightweight Cocos mocks. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Module=require('node:module'),ts=require('typescript');
class Vec3 {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 clone(){return new Vec3(this.x,this.y,this.z);}
 set(x,y,z){if(typeof x==='object'){this.x=x.x;this.y=x.y;this.z=x.z;}else{this.x=x;this.y=y;this.z=z;}return this;}
}
class UITransform {
 constructor(w=100,h=100){this.width=w;this.height=h;this.anchorX=.5;this.anchorY=.5;}
 setContentSize(w,h){this.width=w;this.height=h;}
}
const FitMode={Inherit:0,None:1,ScaleToFit:2};
const SizeType={Fixed:0,Fill:1,Component:2,Layout:3};
const GridCellType={Rectangle:0,Hexagonal:1},GridCellSizing={Uniform:0,FitChildren:1};
const Align={Start:0,Center:1,End:2},GridCorner={BottomLeft:0,BottomRight:1,TopRight:2,TopLeft:3};
const types={FitMode,SizeType,GridCellType,GridCellSizing,Align,GridCorner,Axis:{x:0,y:1},align01:a=>a===0?0:a===2?1:.5};
const decorators={ccclass:()=>C=>C,property:()=>()=>{},menu:()=>C=>C,executeInEditMode:C=>C,requireComponent:()=>C=>C};
const cc={Vec3,UITransform,Color:class {constructor(){}},Enum:x=>x,_decorator:decorators};
class LayoutBase {
 constructor(){this.paddingLeft=0;this.paddingRight=0;this.paddingTop=0;this.paddingBottom=0;
   this._original=new WeakMap();this.placed=[];this.fitChildren=false;this.fitPadding=0;this.fitItemSize=new Vec3();}
 contentSize(v){return v.clone();}
 shouldFit(item){const mode=item.object?.fitMode??FitMode.Inherit;return mode===FitMode.ScaleToFit||(mode===FitMode.Inherit&&this.fitChildren);}
 items(inner,intrinsic=false){
   return this.testItems.map(source=>{
     const o=source.object;
     const initial=source.node.ui;
     const x=o?.widthType===SizeType.Fill?(intrinsic?0:inner.x):initial.width;
     const y=o?.heightType===SizeType.Fill?(intrinsic?0:inner.y):initial.height;
     const size=new Vec3(x,y,1);
     const ml=o?.marginLeft||0,mr=o?.marginRight||0,mt=o?.marginTop||0,mb=o?.marginBottom||0;
     return {...source,size,outer:new Vec3(x+ml+mr,y+mt+mb,1),marginLeft:ml,marginRight:mr,marginTop:mt,marginBottom:mb,marginFront:0,marginBack:0};
   });
 }
 baseScale(node){if(!this._original.has(node))this._original.set(node,node.scale.clone());return this._original.get(node);}
 fitBounds(bounds){return bounds;}
 fitNaturalSize(item){
   const o=item.object, natural=new Vec3(item.node.ui.width,item.node.ui.height,1);
   const sourceX=o?.GetFitSourceSize(0),sourceY=o?.GetFitSourceSize(1);
   if(sourceX>0)natural.x=sourceX;
   if(sourceY>0)natural.y=sourceY;
   if(o?.widthType===SizeType.Fixed)natural.x=o.fixed(0);
   if(o?.heightType===SizeType.Fixed)natural.y=o.fixed(1);
   return natural;
 }
 fitItem(item,bounds,inner,padding=0){
   const natural=this.fitNaturalSize(item,inner);
   item.node.ui.setContentSize(natural.x,natural.y);
   const base=this.baseScale(item.node),mult=item.object?.scaleMultiplier;
   const effective=new Vec3(base.x*(mult?.x??1),base.y*(mult?.y??1),base.z*(mult?.z??1));
   const factor=calculateGridFitScale(natural,effective,
      Math.max(0,bounds.x-item.marginLeft-item.marginRight-padding*2),
      Math.max(0,bounds.y-item.marginTop-item.marginBottom-padding*2),
      item.object?.minSize??new Vec3(),item.object?.maxSize??new Vec3());
   const visual=new Vec3(natural.x*Math.abs(effective.x)*factor,natural.y*Math.abs(effective.y)*factor,1);
   item.size.set(natural);
   item.outer.set(visual.x+item.marginLeft+item.marginRight+padding*2,
                  visual.y+item.marginTop+item.marginBottom+padding*2,1);
   return {scale:factor,visualSize:visual};
 }
 setItemSize(item,size){item.size.set(size);item.outer.set(size.x+item.marginLeft+item.marginRight,size.y+item.marginTop+item.marginBottom,1);}
 place(item,pos,container,index,rotation,fit){
   const baseline=this.baseScale(item.node);
   item.node.scale.set(baseline.x*(fit?.scale ?? 1),baseline.y*(fit?.scale ?? 1),baseline.z*(fit?.scale ?? 1));
   this.placed.push({item,pos,fit,scale:item.node.scale.clone()});
 }
}
const sourceFile=path.resolve(__dirname,'../assets/flexalon/Layouts/FlexalonGridLayout.ts');
const js=ts.transpileModule(fs.readFileSync(sourceFile,'utf8'),{fileName:sourceFile,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,experimentalDecorators:true}}).outputText;
const fakeModule=new Module(sourceFile,module);fakeModule.filename=sourceFile;fakeModule.paths=Module._nodeModulePaths(path.dirname(sourceFile));
const native=fakeModule.require.bind(fakeModule);
const mocks={
 cc,
 '../Core/FlexalonObject':{FlexalonObject:class{}},
 '../Core/FlexalonAdapter':{defaultAdapter:{measure(node){return new Vec3(node.ui.width,node.ui.height,1);}}},
 '../Core/FlexalonLayoutBase':{LayoutBase},
 '../Core/FlexalonTypes':types,
 './FlexalonGridCell':{FlexalonGridCell:class{}},
 '../Core/FlexalonGizmos':{}
};
fakeModule.require=name=>Object.hasOwn(mocks,name)?mocks[name]:native(name);
fakeModule._compile(js,sourceFile);
const {FlexalonGridLayout,calculateGridFitScale}=fakeModule.exports;
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-6, a+' != '+b);
const v=(x,y)=>new Vec3(x,y,0);
const zero=v(0,0);
// Fit both directions, with Min/Max applied to VISUAL SIZE.
approx(calculateGridFitScale(v(200,100),v(1,1),100,100,zero,zero),.5);
approx(calculateGridFitScale(v(60,40),v(1,1),90,90,zero,zero),1.5);
approx(calculateGridFitScale(v(200,100),v(1,1),40,40,v(60,30),v(120,80)),.3);
approx(calculateGridFitScale(v(200,100),v(1,1),300,300,zero,v(120,80)),.6);
approx(calculateGridFitScale(v(200,100),v(2,.5),100,100,zero,zero),.25);
approx(calculateGridFitScale(v(0,0),v(1,1),100,100,zero,zero),1);
approx(calculateGridFitScale(new Vec3(200,100,10),new Vec3(1,1,1),100,100,zero,new Vec3(0,0,4)),.4);
function scenario({w=200,h=100,cellW=100,cellH=100,gridFit=true,mode=FitMode.Inherit,
                   fill=true,min=zero,max=zero,padding=0,cellSizing=GridCellSizing.Uniform,sourceW=0,sourceH=0}={}){
 const grid=new FlexalonGridLayout();
 grid.columns=1;grid.rows=1;grid.columnGap=0;grid.rowGap=0;grid.cellSizing=cellSizing;
 grid.fitChildren=gridFit;grid.cellPadding=padding;
 const node={ui:new UITransform(w,h),scale:new Vec3(1,1,1),getComponent(C){return C===UITransform?this.ui:null;}};
 const object={fitMode:mode,widthType:fill?SizeType.Fill:SizeType.Component,heightType:fill?SizeType.Fill:SizeType.Component,
     minSize:min,maxSize:max,scaleMultiplier:new Vec3(1,1,1),fraction:()=>1,
     GetFitSourceSize:(axis)=>axis===0?sourceW:axis===1?sourceH:0};
 grid.testItems=[{node,object}];
 grid.arrangeChildren(v(cellW,cellH));
 return {grid,node,placed:grid.placed.at(-1)};
}
{
 const {grid,node,placed}=scenario();
 approx(node.scale.x,.5);approx(node.scale.y,.5);
 approx(placed.fit.visualSize.x,100);approx(placed.fit.visualSize.y,50);
 approx(node.ui.width,200);approx(node.ui.height,100); // Fill must not mutate UITransform
 approx(placed.item.outer.x,100);approx(placed.item.outer.y,50);
 grid.arrangeChildren(v(100,100));approx(node.scale.x,.5); // no scale accumulation
}
{
 // A previous Fill pass may already have overwritten UITransform to 100x100.
 // Explicit source 200x100 must restore it BEFORE computing the fit scale.
 const {node,placed}=scenario({w:100,h:100,sourceW:200,sourceH:100});
 approx(node.ui.width,200);approx(node.ui.height,100);
 approx(node.scale.x,.5);approx(placed.fit.visualSize.x,100);
}
{
 const {node,placed}=scenario({cellW:40,cellH:40,min:v(60,30),max:v(120,80)});
 approx(node.scale.x,.3);approx(placed.item.outer.x,60); // Min takes priority; overflow allowed
}
{
 const {node,placed}=scenario({cellW:300,cellH:300,max:v(120,80)});
 approx(node.scale.x,.6);approx(placed.item.outer.x,120);
}
{
 const {node,placed}=scenario({cellW:100,cellH:100,padding:10});
 approx(node.scale.x,.4);approx(placed.item.outer.x,100);
}
{
 const {node,placed}=scenario({gridFit:false,mode:FitMode.ScaleToFit,cellSizing:GridCellSizing.FitChildren});
 approx(node.scale.x,.5);assert(placed.fit,'child override enables fit');
}
{
 const {node,placed}=scenario({gridFit:true,mode:FitMode.None,fill:false});
 assert.equal(placed.fit,undefined,'child override disables fit');
 approx(node.scale.x,1);
}
{
 const {node,placed}=scenario({gridFit:false,fill:false});
 assert.equal(placed.fit,undefined,'default Grid behavior unchanged');
 approx(node.scale.x,1);
}
{
 // Backward compatibility: old scenes using Fit Children To Cell upgrade into the
 // shared Fit Children toggle without leaving a second active switch.
 const grid=new FlexalonGridLayout();
 grid.fitChildren=false;grid.fitChildrenToCell=true;
 const original=Object.getPrototypeOf(FlexalonGridLayout.prototype).onEnable;
 try{
     Object.getPrototypeOf(FlexalonGridLayout.prototype).onEnable=function(){};
     grid.onEnable();
 }finally{Object.getPrototypeOf(FlexalonGridLayout.prototype).onEnable=original;}
 assert.equal(grid.fitChildren,true);
 assert.equal(grid.fitChildrenToCell,false);
 grid.fitChildren=false;
 assert.equal(grid.fitChildren,false,'User can turn new Fit toggle off');
}
console.log('PASS: Grid Scale To Fit up/down, Fill intrinsic size, Min/Max visual limits, non-uniform baseline, padding, overrides, no accumulation');
