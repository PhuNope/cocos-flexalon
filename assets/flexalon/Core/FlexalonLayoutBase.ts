import { _decorator, CCObject, Vec3, UITransform, Node, Enum, Quat } from 'cc';
import { FlexalonComponent } from './FlexalonComponent';
import { FlexalonObject } from './FlexalonObject';
import { FlexalonResult } from './FlexalonResult';
import { Layout } from './FlexalonLayout';
import { Align, SizeType, align01, axisValue, setAxis } from './FlexalonTypes';
import { defaultAdapter } from './FlexalonAdapter';
import { FlexalonMath } from './FlexalonMath';
import { FlexalonModifier } from './FlexalonModifier';
import { FlexalonLerpAnimator } from '../Animators/FlexalonLerpAnimator';
import { FlexalonCurveAnimator } from '../Animators/FlexalonCurveAnimator';
import { FlexalonInteractable } from '../Interaction/FlexalonInteractable';
import { syncGizmosSelection, flexalonGizmos, rect, drawLocalLineList, quadInParent, boundsColor, paddingColor, marginColor } from './FlexalonGizmos';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;
export type Item = { node: Node; object: FlexalonObject | null; size: Vec3; outer: Vec3; marginLeft: number; marginRight: number; marginTop: number; marginBottom: number; marginBack: number; marginFront: number; };

/** Base layout in editor and at runtime. Existing Cocos UITransform widths/heights are local units. */
@ccclass('Flexalon.LayoutBase')
@executeInEditMode
@requireComponent(FlexalonObject)
export class LayoutBase extends FlexalonComponent implements Layout {
    @property({tooltip: 'Hiển thị Gizmos khi chọn Node (cần extension Cocos-Gizmos v2).', visible: true})
    public showGizmos = true;
    @property({tooltip: 'Vẽ Content Bounds và Margin của từng child.', visible: true})
    public showChildBounds = false;

    /** Cocos-Gizmos discovers this hook; Flexalon does not register its own renderer. */
    public onDrawGizmos():void { syncGizmosSelection(this.node); }
    public onDrawGizmosSelected(): void {
      if (!this.showGizmos || !this.node) return;
      const g = flexalonGizmos(), ui = this.node.getComponent(UITransform);
      if (!g || !ui) return;
      const x = -ui.anchorX * ui.width, y = -ui.anchorY * ui.height;
      g.beginColor(this.node, boundsColor);
      rect(g, this.node, x, y, ui.width, ui.height);
      g.beginColor(this.node, paddingColor);
      rect(g, this.node, x + this.paddingLeft, y + this.paddingBottom,
        Math.max(0, ui.width - this.paddingLeft - this.paddingRight),
        Math.max(0, ui.height - this.paddingTop - this.paddingBottom));
      if (this.showChildBounds) for (const child of this.node.children) {
        // Cocos-Gizmos creates hidden DontSave drawing children; exclude them.
        if ((child.hideFlags & CCObject.Flags.DontSave) !== 0 ||
          (!child.active && !this.includeInactive)) continue;
        const obj = child.getComponent(FlexalonObject);
        if (obj?.skipLayout || child.getComponent(FlexalonInteractable)?.IsDragging ||
          (child.getComponent(FlexalonCurveAnimator)?.enabledInHierarchy && child.getComponent(FlexalonCurveAnimator)?.ignoreParentLayout)) continue;
        const pts = quadInParent(this.node, child);
        if (!pts) continue;
        g.beginColor(this.node, boundsColor);
        drawLocalLineList(g, this.node, pts, true);
        if (obj && (obj.marginLeft || obj.marginRight || obj.marginTop || obj.marginBottom)) {
          const m = quadInParent(this.node, child, {
            left:obj.marginLeft, right:obj.marginRight, top:obj.marginTop, bottom:obj.marginBottom
          });
          if (m) { g.beginColor(this.node, marginColor); drawLocalLineList(g, this.node, m, true); }
        }
      }
    }
    @property({tooltip: "Tự tính lại và sắp xếp child khi chạy / ở Edit Mode. Tắt nếu muốn gọi ForceUpdate() thủ công.", visible: true}) public autoUpdate = true;
    @property({tooltip: "Tính cả child inactive khi đo và sắp xếp layout.", visible: true}) public includeInactive = false;
    @property({tooltip: "Khoảng đệm bên trái vùng chứa layout.", visible: true}) public paddingLeft = 0;
    @property({tooltip: "Khoảng đệm bên phải vùng chứa layout.", visible: true}) public paddingRight = 0;
    @property({tooltip: "Khoảng đệm phía trên vùng chứa layout.", visible: true}) public paddingTop = 0;
    @property({tooltip: "Khoảng đệm phía dưới vùng chứa layout.", visible: true}) public paddingBottom = 0;
    @property({tooltip: "Khoảng đệm phía trước theo trục Z.", visible: true}) public paddingFront = 0;
    @property({tooltip: "Khoảng đệm phía sau theo trục Z.", visible: true}) public paddingBack = 0;
    private _running = false;
    private static originalScales = new WeakMap<Node, Vec3>();
    protected lateUpdate(): void {
        if(!this.autoUpdate || !this.enabledInHierarchy || this.hasLayoutAncestor()) return;
        this.ForceUpdate();
    }
    public ForceUpdate(): void {
        if (this._running || !this.node.activeInHierarchy || !this.enabledInHierarchy) return;
        this._running = true;
        try { const size = this.getCurrentSize(); this.arrangeChildren(size); this._dirty = false; }
        finally { this._running = false; }
    }
    protected hasLayoutAncestor(): boolean {
        for(let n=this.node.parent;n;n=n.parent){
            const l=n.getComponent(LayoutBase);
            if(l && l.enabledInHierarchy && l.autoUpdate) return true;
        }
        return false;
    }
    protected getCurrentSize(): Vec3 {
        const obj=this.node.getComponent(FlexalonObject);
        // A layout container can itself have FlexalonObject Fixed dimensions.
        // Sync the actual UITransform before its size is used by the layout.
        obj?.SyncFixedUIContentSize();
        const ui=this.node.getComponent(UITransform);
        const natural=ui ? new Vec3(ui.width, ui.height, 1) : defaultAdapter.measure(this.node);
        if (obj) {
            // Fixed axes can constrain the space offered to the layout's children.
            for (let axis=0; axis<3; axis++) {
                if (obj.typeForAxis(axis)===SizeType.Fixed) {
                    setAxis(natural,axis,obj.clampSize(axis,obj.fixed(axis)));
                }
            }
            // IMPORTANT: Layout means fit the size COMPUTED BY THIS LAYOUT.
            // The previous port used measureIntrinsic only when this node was
            // measured by another layout, so root layout containers never grew.
            if ([0,1,2].some(axis => obj.typeForAxis(axis)===SizeType.Layout)) {
                const intrinsic=this.measureIntrinsic(natural);
                for (let axis=0; axis<3; axis++) {
                    if (obj.typeForAxis(axis)===SizeType.Layout) {
                        setAxis(natural,axis,obj.clampSize(axis,axisValue(intrinsic,axis)));
                    }
                }
                // UITransform is the physical size used by Cocos sprites/masks,
                // hit testing, and widgets. Do not change Component or Fill axes.
                if (ui && !obj.preserveUIContentSize) {
                    const w=obj.widthType===SizeType.Layout ? natural.x : ui.width;
                    const h=obj.heightType===SizeType.Layout ? natural.y : ui.height;
                    if (Math.abs(ui.width-w)>0.0001 || Math.abs(ui.height-h)>0.0001) {
                        ui.setContentSize(w,h);
                    }
                }
            }
        }
        return natural;
    }
    protected contentSize(size: Vec3): Vec3 { return new Vec3(Math.max(0,size.x-this.paddingLeft-this.paddingRight),Math.max(0,size.y-this.paddingTop-this.paddingBottom),Math.max(0,size.z-this.paddingFront-this.paddingBack)); }
    protected contentCenter(size: Vec3): Vec3 {
        const ui=this.node.getComponent(UITransform);
        const x=ui ? (0.5-ui.anchorX)*size.x : 0;
        const y=ui ? (0.5-ui.anchorY)*size.y : 0;
        return new Vec3(x+(this.paddingLeft-this.paddingRight)*0.5, y+(this.paddingBottom-this.paddingTop)*0.5, (this.paddingBack-this.paddingFront)*0.5);
    }
    protected items(available: Vec3, measuringIntrinsic = false): Item[] {
        return this.node.children.filter(n=>(n.hideFlags & CCObject.Flags.DontSave)===0).filter(n=>this.includeInactive || n.active).filter(n=>!n.getComponent(FlexalonObject)?.skipLayout && !n.getComponent(FlexalonInteractable)?.IsDragging &&
            !(n.getComponent(FlexalonCurveAnimator)?.enabledInHierarchy && n.getComponent(FlexalonCurveAnimator)?.ignoreParentLayout)).map(n=>this.measureItem(n,available,measuringIntrinsic));
    }
    protected measureItem(node: Node, available: Vec3, measuringIntrinsic = false): Item {
        const obj=node.getComponent(FlexalonObject);
        const natural=defaultAdapter.measure(node);
        const nested=node.getComponent(LayoutBase);
        const needIntrinsic=!!obj && [0,1,2].some(axis=>obj.typeForAxis(axis)===SizeType.Layout);
        const intrinsic=needIntrinsic && nested && nested.enabledInHierarchy ? nested.measureIntrinsic(available) : natural;
        const size=new Vec3();
        for(let a=0;a<3;a++){
            const mode=obj?.typeForAxis(a) ?? SizeType.Component;
            let value=axisValue(natural,a);
            if(mode===SizeType.Fixed) value=obj!.fixed(a);
            else if(mode===SizeType.Layout) value=axisValue(intrinsic,a);
            // During intrinsic measurement a Fill child has NO intrinsic extent:
            // including parent available size creates a circular dependency
            // (Layout contains Fill contains Layout...). MinSize still applies.
            else if(mode===SizeType.Fill) value=measuringIntrinsic ? 0 : Math.max(0,axisValue(available,a))*obj!.fraction(a);
            setAxis(size,a, obj ? obj.clampSize(a,value) : value);
        }
        const ml=obj?.marginLeft??0, mr=obj?.marginRight??0, mt=obj?.marginTop??0, mb=obj?.marginBottom??0, mf=obj?.marginFront??0, mk=obj?.marginBack??0;
        return { node,object:obj,size,outer:new Vec3(size.x+ml+mr,size.y+mt+mb,size.z+mf+mk),marginLeft:ml,marginRight:mr,marginTop:mt,marginBottom:mb,marginFront:mf,marginBack:mk};
    }
    protected setItemSize(item: Item, newSize: Vec3): void {
        const o=item.object;
        const x=o?o.clampSize(0,newSize.x):newSize.x,y=o?o.clampSize(1,newSize.y):newSize.y,z=o?o.clampSize(2,newSize.z):newSize.z;
        item.size.set(x,y,z);
        item.outer.set(x+item.marginLeft+item.marginRight,y+item.marginTop+item.marginBottom,z+item.marginFront+item.marginBack);
    }
    /** Coordinates reference the CENTER of the item's outer/margin box. */
    protected place(item: Item, outerCenter: Vec3, containerSize: Vec3, index = 0, rotation: Vec3 | null = null): void {
        const parentCenter=this.contentCenter(containerSize);
        let pos=outerCenter.clone();
        pos.x+=(item.marginLeft-item.marginRight)/2 + parentCenter.x;
        pos.y+=(item.marginBottom-item.marginTop)/2 + parentCenter.y;
        pos.z+=(item.marginBack-item.marginFront)/2 + parentCenter.z;
        const ui=item.node.getComponent(UITransform);
        if(ui){ pos.x+=(ui.anchorX-0.5)*item.size.x;pos.y+=(ui.anchorY-0.5)*item.size.y; }
        if(item.object) pos.add(item.object.offset);
        // Modifiers are only applied to computed layout positions, never cumulative.
        const mods=this.node.getComponents('Flexalon.FlexalonRandomModifier') as unknown as FlexalonModifier[];
        for(const mod of mods) if(typeof mod.modify==='function') pos=mod.modify(item.node,index,pos);
        const current=item.node.position;
        const animator=item.node.getComponent(FlexalonLerpAnimator);
        if(animator?.enabledInHierarchy) animator.moveTo(pos);
        else if(!FlexalonMath.VecApproximately(current,pos)) item.node.setPosition(pos);
        if(ui && !(item.object?.preserveUIContentSize)) {
            const w=item.size.x,h=item.size.y;
            const needW= item.object?.widthType!==SizeType.Component;
            const needH= item.object?.heightType!==SizeType.Component;
            if((needW && Math.abs(ui.width-w)>0.0001) || (needH && Math.abs(ui.height-h)>0.0001)) ui.setContentSize(needW?w:ui.width,needH?h:ui.height);
        }
        const rot=rotation ? rotation.clone() : new Vec3();
        if(item.object) rot.add(item.object.rotationOffset);
        // Always apply the target rotation, including identity. Previously an
        // already-rotated child kept its old angle when a plain layout produced
        // (0, 0, 0), because the zero-angle case skipped setRotation entirely.
        const q = new Quat();
        Quat.fromEuler(q,rot.x,rot.y,rot.z);
        if(!Quat.equals(item.node.rotation,q)) item.node.setRotation(q);
        if(item.object) {
            let baseline=LayoutBase.originalScales.get(item.node);
            if(!baseline){baseline=item.node.scale.clone();LayoutBase.originalScales.set(item.node,baseline);}
            const mult=item.object.scaleMultiplier;
            const target=new Vec3(baseline.x*mult.x,baseline.y*mult.y,baseline.z*mult.z);
            if(!FlexalonMath.VecApproximately(item.node.scale,target))item.node.setScale(target);
        }
        // No automatic multiplication of scale every frame.
        const result=item.node.getComponent(FlexalonResult);
        if(result){result.LayoutPosition.set(pos);result.LayoutSize.set(item.size);result.LayoutRotation = q.clone();result.SiblingIndex=index;}
        const nested=item.node.getComponent(LayoutBase);
        if(nested && nested!==this && nested.enabledInHierarchy) nested.arrangeChildren(item.size.clone());
    }
    protected aligned(size: number, outer: number, alignment: Align): number { return (align01(alignment)-0.5)*(size-outer); }
    /** Used by parent nodes with SizeType.Layout; subclasses override to return minimum content dimensions. */
    public measureIntrinsic(available: Vec3): Vec3 {
        const items=this.items(this.contentSize(available), true);
        let x=0,y=0,z=0;
        for(const i of items){x=Math.max(x,i.outer.x);y=Math.max(y,i.outer.y);z=Math.max(z,i.outer.z);}
        return new Vec3(x+this.paddingLeft+this.paddingRight,y+this.paddingTop+this.paddingBottom,z+this.paddingFront+this.paddingBack);
    }
    public arrangeChildren(_size: Vec3): void { /* extension point */ }
}
