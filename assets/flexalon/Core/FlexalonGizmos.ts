/** Adapter for PhuNope/Cocos-Gizmos v2. Types only: no runtime import or global declaration.
 * The Cocos-Gizmos extension owns the sole Gizmos2D runtime and its global .d.ts bridge.
 */
import { Color, Node, UITransform, Vec3 } from 'cc';
import type { IVec2Like } from 'cc';

export interface Gizmos2DShape {
  beginColor(node: Node, color: Color): void;
  beginLocalPosition(node: Node): void;
  endLocalPosition(node: Node): void;
  drawLineList(node: Node, points: IVec2Like[], close?: boolean): void;
  drawCircle(node: Node, center: IVec2Like, radius: number): void;
}

/** Prefer the one existing Cocos-Gizmos extension. When absent, draw nothing. */
export function flexalonGizmos(): Gizmos2DShape | undefined {
  const runtime = (globalThis as unknown as { Gizmos2D?: Gizmos2DShape }).Gizmos2D;
  return runtime && typeof runtime.beginLocalPosition === 'function' &&
    typeof runtime.drawLineList === 'function' ? runtime : undefined;
}
export const boundsColor = new Color(52, 208, 213, 230);
export const marginColor = new Color(255, 196, 72, 225);
export const paddingColor = new Color(94, 218, 131, 225);
export const pathColor = new Color(255, 112, 174, 235);

export function rect(g: Gizmos2DShape, node: Node, x: number, y: number, w: number, h: number): void {
  if (![x,y,w,h].every(Number.isFinite) || w < 0 || h < 0) return;
  drawLocalLineList(g,node,[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}],true);
}

export function quadInParent(parent: Node, child: Node, margins?: {
  left: number; right: number; top: number; bottom: number;
}): {x:number;y:number}[] | undefined {
  const ui=child.getComponent(UITransform);
  if(!ui)return undefined;
  const l=-ui.anchorX*ui.width-(margins?.left||0), b=-ui.anchorY*ui.height-(margins?.bottom||0);
  const x=(1-ui.anchorX)*ui.width+(margins?.right||0), y=(1-ui.anchorY)*ui.height+(margins?.top||0);
  return [new Vec3(l,b),new Vec3(x,b),new Vec3(x,y),new Vec3(l,y)].map(p=>{
    const world=new Vec3(), local=new Vec3();
    Vec3.transformMat4(world,p,child.worldMatrix);
    parent.inverseTransformPoint(local,world);
    return {x:local.x,y:local.y};
  });
}

// World-space line helpers avoid the nested Cocos-Gizmos renderer trap:
// getComponentInChildren() may reuse a GizmosDebugDraw from a descendant.
// The installed Gizmos runtime transforms these world points to renderer-local.
export function drawLocalLineList(g: Gizmos2DShape, node: Node, points: ReadonlyArray<IVec2Like>, close = false): void {
  const mat=node.worldMatrix;
  g.drawLineList(node, points.map(p=>{
    const world=new Vec3();
    Vec3.transformMat4(world,new Vec3(p.x,p.y,0),mat);
    return {x:world.x,y:world.y};
  }),close);
}
export function drawLocalCircle(g:Gizmos2DShape,node:Node,center:IVec2Like,radius:number):void {
  if(!Number.isFinite(radius)||radius<=0)return;
  const p=Array.from({length:24},(_,i)=>{
    const a=i*Math.PI*2/24;
    return {x:center.x+Math.cos(a)*radius,y:center.y+Math.sin(a)*radius};
  });
  drawLocalLineList(g,node,p,true);
}
