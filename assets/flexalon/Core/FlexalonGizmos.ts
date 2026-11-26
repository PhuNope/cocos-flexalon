/** Optional adapter for PhuNope/Cocos-Gizmos v3 (3.0.3+). No SDK import or global declaration.
 * The Cocos-Gizmos extension owns the sole Gizmos2D runtime and its global .d.ts bridge.
 */
import { Canvas, CCObject, Color, Node, UITransform, Vec2, Vec3 } from 'cc';
import { EDITOR_NOT_IN_PREVIEW } from 'cc/env';
import type { IVec2Like } from 'cc';

export interface Gizmos2DShape {
  beginColor(node: Node, color: Color): void;
  beginLocalPosition(node: Node): void;
  endLocalPosition(node: Node): void;
  drawLineList(node: Node, points: IVec2Like[], close?: boolean): void;
  drawCircle(node: Node, center: IVec2Like, radius: number): void;
  drawLabel?(node: Node, id: string, text: string, position: IVec2Like, fontSize?: number): void;
}

/** The upstream v3 drawLabel accepts a scale and optional screen-pixel bounds.
 * Keep the SDK shape separate from the Flexalon world-space drawing facade.
 */
interface Gizmos2DRuntime {
  beginColor(node: Node, color: Color): void;
  endLocalPosition(node: Node): void;
  drawLineList(node: Node, points: IVec2Like[], close?: boolean): void;
  drawCircle(node: Node, center: IVec2Like, radius: number): void;
  drawLabel?(node: Node, id: string, text: string, position: IVec2Like,
    fontSize?: number, scale?: Vec2, minSize?: number, maxSize?: number): void;
}

const LABEL_MIN_PIXELS = 11;
const LABEL_MAX_PIXELS = 22;

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
function isFlexalonAnchor(node: Node): boolean {
  const flags = CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;
  return node.isValid && node.name === ANCHOR_NAME && (node.hideFlags & flags) === flags;
}

/** Keep selection cleanup for immediate removal of old labels/lines.
 * v3 owns selection dispatch and flushes pending renderers after callbacks.
 * Touch an existing anchor (not a new one) so idle geometry/labels can expire
 * even in restored Scene tabs where GizmosDebugDraw.lateUpdate is absent.
 */
export function syncGizmosSelection(node: Node): void {
  if (!EDITOR_NOT_IN_PREVIEW || !node?.isValid) return;
  type SelectionEditor = { Selection?: { getSelected?: (type: string) => unknown } };
  const globals = globalThis as unknown as {
    Editor?: SelectionEditor; window?: { Editor?: SelectionEditor };
  };
  const selectionApi = (globals.Editor || globals.window?.Editor)?.Selection;
  let selection: unknown;
  try { selection = selectionApi?.getSelected?.('node'); }
  catch { /* Scene-side selection may be temporarily unavailable. */ }

  const owner = gizmoOwner(node);
  for (const anchor of activeAnchors) {
    if (!anchor.isValid || !anchor.parent?.isValid) activeAnchors.delete(anchor);
  }
  if (Array.isArray(selection) && selection.every(id => typeof id === 'string')) {
    const key = JSON.stringify([...new Set(selection)].sort());
    if (lastSelectionKey !== key) {
      lastSelectionKey = key;
      for (const child of owner.children) if (isFlexalonAnchor(child)) activeAnchors.add(child);
      for (const anchor of activeAnchors) {
        if (!anchor.isValid) continue;
        anchor.removeFromParent();
        anchor.destroy();
      }
      activeAnchors.clear();
      anchors = new WeakMap<Node, Node>();
      return;
    }
  }

  const anchor = anchors.get(owner);
  // endLocalPosition is a public v3 operation; it queues the renderer for
  // the SDK's flushEditorFrame without submitting new geometry.
  if (anchor && isFlexalonAnchor(anchor) && anchor.parent === owner && anchor.children.length) {
    runtimeGizmos()?.endLocalPosition(anchor);
  }
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
  anchor = owner.children.find(isFlexalonAnchor);
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
function runtimeGizmos(): Gizmos2DRuntime | undefined {
  if (!EDITOR_NOT_IN_PREVIEW) return undefined;
  const runtime = (globalThis as unknown as { Gizmos2D?: Gizmos2DRuntime }).Gizmos2D;
  return runtime && typeof runtime.beginColor === 'function' &&
    typeof runtime.endLocalPosition === 'function' &&
    typeof runtime.drawLineList === 'function' &&
    typeof runtime.drawCircle === 'function' ? runtime : undefined;
}

function worldAnchor(runtime: Gizmos2DRuntime, node: Node): Node {
  const anchor = anchorFor(node);
  // v3 retains draw state until the SDK flushes the frame. Explicitly
  // request world-space coordinates before submitting Flexalon commands.
  runtime.endLocalPosition(anchor);
  return anchor;
}

const stableGizmos: Gizmos2DShape = {
  beginColor(node, color) {
    const runtime = runtimeGizmos();
    if (runtime) runtime.beginColor(worldAnchor(runtime, node), color);
  },
  beginLocalPosition(_node) { /* facade accepts world-space only */ },
  endLocalPosition(_node) { /* facade accepts world-space only */ },
  drawLineList(node, points, close = false) {
    const runtime = runtimeGizmos();
    if (runtime) runtime.drawLineList(worldAnchor(runtime, node), points, close);
  },
  drawCircle(node, center, radius) {
    const runtime = runtimeGizmos();
    if (runtime) runtime.drawCircle(worldAnchor(runtime, node), center, radius);
  },
  drawLabel(node, id, text, position, fontSize = 12) {
    const runtime = runtimeGizmos();
    if (runtime?.drawLabel) {
      runtime.drawLabel(worldAnchor(runtime, node), id, text, position,
        fontSize, Vec2.ONE, LABEL_MIN_PIXELS, LABEL_MAX_PIXELS);
    }
  },
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

/** Labels use the same stable Canvas anchor and world-space transform as lines. */
export function drawLocalLabel(g: Gizmos2DShape, node: Node, id: string,
  text: string, point: IVec2Like, fontSize = 12): void {
  if (!g.drawLabel) return;
  const world = new Vec3();
  Vec3.transformMat4(world, new Vec3(point.x, point.y, 0), node.worldMatrix);
  g.drawLabel(node, id, text, {x: world.x, y: world.y}, fontSize);
}
