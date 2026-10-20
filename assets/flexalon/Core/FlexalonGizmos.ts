/** Adapter for PhuNope/Cocos-Gizmos v2. Types only: no runtime import or global declaration.
 * The Cocos-Gizmos extension owns the sole Gizmos2D runtime and its global .d.ts bridge.
 */
import { Canvas, CCObject, Color, Node, UITransform, Vec3 } from 'cc';
import type { IVec2Like } from 'cc';

export interface Gizmos2DShape {
  beginColor(node: Node, color: Color): void;
  beginLocalPosition(node: Node): void;
  endLocalPosition(node: Node): void;
  drawLineList(node: Node, points: IVec2Like[], close?: boolean): void;
  drawCircle(node: Node, center: IVec2Like, radius: number): void;
}

/**
 * Cocos-Gizmos uses getComponentInChildren() when resolving its renderer.
 * Layout parent and child must not share a debug node from the layout tree:
 * after selecting a child first, the parent can otherwise render with the
 * child's transform. Use one unsaved, hidden and stable anchor per Canvas.
 * Only the existing global Gizmos2D runtime is called; no second import.
 */
const ANCHOR_NAME = '__FLEXALON_GIZMOS_2D__';
let anchors = new WeakMap<Node, Node>();
const activeAnchors = new Set<Node>();
let lastSelectionKey: string | null = null;
/** Explicitly discard Graphics when Editor selection changes or is cleared. */
export function syncGizmosSelection(node: Node): void {
  const editor = (globalThis as unknown as {
    Editor?: { Selection?: { getSelected?: (type: string) => string[] } }
  }).Editor;
  const getSelected = editor?.Selection?.getSelected;
  if (typeof getSelected !== 'function') return;
  let selection: string[];
  try { selection = getSelected.call(editor!.Selection, 'node') || []; }
  catch { return; }
  const key = [...selection].sort().join('|');
  if (lastSelectionKey === key) return;
  lastSelectionKey = key;
  const owner = gizmoOwner(node);
  const previous = owner.children.find(c => c.name === ANCHOR_NAME);
  if (previous) activeAnchors.add(previous);
  for (const anchor of activeAnchors) {
    if (!anchor.isValid) continue;
    anchor.removeFromParent();
    anchor.destroy();
  }
  activeAnchors.clear();
  anchors = new WeakMap<Node, Node>();
}
function gizmoOwner(node: Node): Node {
  let owner: Node | null = null;
  for (let n: Node | null = node; n; n = n.parent) {
    if (n.getComponent(Canvas)) return n;
    if (!n.parent) owner = n;
  }
  return owner ?? node;
}
function anchorFor(node: Node): Node {
  const owner = gizmoOwner(node);
  let anchor = anchors.get(owner);
  if (anchor?.isValid && anchor.parent === owner) return anchor;
  anchor = owner.children.find(c => c.name === ANCHOR_NAME && (c.hideFlags & CCObject.Flags.DontSave) !== 0);
  if (!anchor) {
    anchor = new Node(ANCHOR_NAME);
    anchor.hideFlags |= CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;
    anchor.setParent(owner);
    anchor.setPosition(0, 0, 0);
  }
  anchors.set(owner, anchor);
  activeAnchors.add(anchor);
  return anchor;
}
function runtimeGizmos(): Gizmos2DShape | undefined {
  const runtime = (globalThis as unknown as { Gizmos2D?: Gizmos2DShape }).Gizmos2D;
  return runtime && typeof runtime.beginColor === 'function' &&
    typeof runtime.drawLineList === 'function' ? runtime : undefined;
}
const stableGizmos: Gizmos2DShape = {
  beginColor(node, color) { runtimeGizmos()?.beginColor(anchorFor(node), color); },
  beginLocalPosition(_node) { /* always world-space; never mutate shared renderer state */ },
  endLocalPosition(_node) { /* always world-space */ },
  drawLineList(node, points, close = false) { runtimeGizmos()?.drawLineList(anchorFor(node), points, close); },
  drawCircle(node, center, radius) { runtimeGizmos()?.drawCircle(anchorFor(node), center, radius); },
};
export function flexalonGizmos(): Gizmos2DShape | undefined {
  return runtimeGizmos() ? stableGizmos : undefined;
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
