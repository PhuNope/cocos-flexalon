import { _decorator, CCObject, Vec3, UITransform, Node, Enum, Quat } from 'cc';
import { FlexalonComponent } from './FlexalonComponent';
import { FlexalonObject } from './FlexalonObject';
import { FlexalonResult } from './FlexalonResult';
import { Layout } from './FlexalonLayout';
import { Align, SizeType, FitMode, align01, axisValue, setAxis } from './FlexalonTypes';
import { defaultAdapter } from './FlexalonAdapter';
import { FlexalonMath } from './FlexalonMath';
import { FlexalonModifier } from './FlexalonModifier';
import { FlexalonLerpAnimator } from '../Animators/FlexalonLerpAnimator';
import { FlexalonCurveAnimator } from '../Animators/FlexalonCurveAnimator';
import { FlexalonInteractable } from '../Interaction/FlexalonInteractable';
import { syncGizmosSelection, flexalonGizmos, rect, drawLocalLineList, quadInParent, boundsColor, paddingColor, marginColor } from './FlexalonGizmos';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;
export type Item = { node: Node; object: FlexalonObject | null; size: Vec3; outer: Vec3; marginLeft: number; marginRight: number; marginTop: number; marginBottom: number; marginBack: number; marginFront: number; };
export type FitResult = { scale: number; visualSize: Vec3 };
type ManagedChildState = {
    owner: LayoutBase;
    baseline: Vec3;
    originalContent: Vec3 | null;
    lastAppliedScale: Vec3 | null;
    lastAppliedContent: Vec3 | null;
};
/** Min/Max constrain the VISUAL size after original node scale and multiplier.
 * Min wins conflicts: a child can intentionally overflow a too-small slot.
 */
export function calculateFitScale(natural: Vec3, baseline: Vec3, width: number, height: number, min: Vec3, max: Vec3): number {
    const visualX=Math.max(0,natural.x)*Math.abs(baseline.x),visualY=Math.max(0,natural.y)*Math.abs(baseline.y);
    const visualZ=Math.max(0,natural.z)*Math.abs(baseline.z),eps=1e-8;
    const desired=Math.min(visualX>eps?Math.max(0,width)/visualX:Infinity,
        visualY>eps?Math.max(0,height)/visualY:Infinity);
    const lower=Math.max(0,visualX>eps?Math.max(0,min.x)/visualX:0,
        visualY>eps?Math.max(0,min.y)/visualY:0,visualZ>eps?Math.max(0,min.z)/visualZ:0);
    const upper=Math.min(visualX>eps&&max.x>0?max.x/visualX:Infinity,
        visualY>eps&&max.y>0?max.y/visualY:Infinity,visualZ>eps&&max.z>0?max.z/visualZ:Infinity);
    return Math.max(lower,Math.min(upper,Number.isFinite(desired)?desired:1));
}

/** Base layout in editor and at runtime. Existing Cocos UITransform widths/heights are local units. */
@ccclass('Flexalon.LayoutBase')
@executeInEditMode
@requireComponent(FlexalonObject)
export class LayoutBase extends FlexalonComponent implements Layout {
    @property({tooltip: 'Hiển thị Gizmos khi chọn Node (cần extension Cocos-Gizmos v2).', visible: true})
    public showGizmos = true;
    @property({tooltip: 'Vẽ Content Bounds và Margin của từng child.', visible: true})
    public showChildBounds = false;
    @property({tooltip: 'Scale To Fit các child thuộc layout này; child có Fit Mode riêng được ưu tiên. Mặc định TẮT để giữ Scene cũ.', visible:true,displayName:'Fit Children'})
    public fitChildren = false;
    @property({tooltip: 'Khoảng đệm mỗi phía quanh item khi Fit (local units).', visible:true,displayName:'Fit Padding'})
    public fitPadding = 0;
    @property({tooltip: 'Giới hạn vùng Fit tối đa cho mỗi item (X/Y). Giá trị 0 = tự xác định theo Layout; Circle/Curve/Shape/Random có thể dùng Max Size của child hoặc nhập vùng Fit này.', visible:true,displayName:'Fit Item Size'})
    public fitItemSize: Vec3 = new Vec3();


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
    private _observedChildren = new Set<Node>();
    private _ownedChildren = new Set<Node>();
    /** A child belongs to its CURRENT layout, not to a global immortal scale cache. */
    private static childStates = new WeakMap<Node, ManagedChildState>();

    private static sizeMatches(ui: UITransform, size: Vec3 | null): boolean {
        return !!size && Math.abs(ui.width - size.x) < 0.0001 &&
            Math.abs(ui.height - size.y) < 0.0001;
    }

    private static releaseChild(node: Node, state: ManagedChildState): void {
        if (LayoutBase.childStates.get(node) !== state) return;
        // Do not overwrite a user edit that happened after the last layout write.
        if (state.lastAppliedScale &&
            FlexalonMath.VecApproximately(node.scale, state.lastAppliedScale) &&
            !FlexalonMath.VecApproximately(node.scale, state.baseline)) {
            node.setScale(state.baseline);
        }
        const ui = node.getComponent(UITransform);
        if (ui && state.originalContent &&
            LayoutBase.sizeMatches(ui, state.lastAppliedContent) &&
            !LayoutBase.sizeMatches(ui, state.originalContent)) {
            ui.setContentSize(state.originalContent.x, state.originalContent.y);
        }
        state.owner._ownedChildren.delete(node);
        LayoutBase.childStates.delete(node);
    }

    private releaseOwnedChildren(): void {
        for (const child of [...this._ownedChildren]) {
            const state = LayoutBase.childStates.get(child);
            if (state && state.owner === this) LayoutBase.releaseChild(child, state);
            else this._ownedChildren.delete(child);
        }
    }

    /** External Inspector edits become the new baseline; layout writes are ignored. */
    private captureEditedChildren(): void {
        for (const child of this._ownedChildren) {
            const state = LayoutBase.childStates.get(child);
            if (!state || state.owner !== this) continue;
            if (state.lastAppliedScale &&
                !FlexalonMath.VecApproximately(child.scale, state.lastAppliedScale)) {
                state.baseline = child.scale.clone();
                state.lastAppliedScale = null;
            }
            const ui = child.getComponent(UITransform);
            if (ui && state.lastAppliedContent &&
                !LayoutBase.sizeMatches(ui, state.lastAppliedContent)) {
                state.originalContent = new Vec3(ui.width, ui.height, 1);
                state.lastAppliedContent = null;
                child.getComponent(FlexalonObject)?.CaptureFitSourceSize?.();
            }
        }
    }

    /** Stable base scale for the active owner; never reuse the old Fit factor. */
    protected baseScale(node: Node): Vec3 {
        let state = LayoutBase.childStates.get(node);
        if (state && state.owner !== this) {
            LayoutBase.releaseChild(node, state);
            state = undefined;
        }
        if (!state) {
            const ui = node.getComponent(UITransform);
            state = {
                owner: this,
                baseline: node.scale.clone(),
                originalContent: ui ? new Vec3(ui.width, ui.height, 1) : null,
                lastAppliedScale: null,
                lastAppliedContent: null,
            };
            LayoutBase.childStates.set(node, state);
            this._ownedChildren.add(node);
        } else {
            if (state.lastAppliedScale &&
                !FlexalonMath.VecApproximately(node.scale, state.lastAppliedScale)) {
                state.baseline = node.scale.clone();
                state.lastAppliedScale = null;
            }
            const ui = node.getComponent(UITransform);
            if (ui && state.lastAppliedContent &&
                !LayoutBase.sizeMatches(ui, state.lastAppliedContent)) {
                state.originalContent = new Vec3(ui.width, ui.height, 1);
                state.lastAppliedContent = null;
                node.getComponent(FlexalonObject)?.CaptureFitSourceSize?.();
            }
        }
        return state.baseline;
    }

    /** If multiple layouts are enabled on one node, the last component owns it. */
    private isActiveLayoutOwner(): boolean {
        const layouts = this.node.getComponents(LayoutBase).filter(l => l.enabledInHierarchy);
        return layouts.length === 0 || layouts[layouts.length - 1] === this;
    }

    private recordPlacedChild(node: Node): void {
        const state = LayoutBase.childStates.get(node);
        if (!state || state.owner !== this) return;
        state.lastAppliedScale = node.scale.clone();
        const ui = node.getComponent(UITransform);
        state.lastAppliedContent = ui ? new Vec3(ui.width, ui.height, 1) : null;
    }

    protected onEnable(): void {
        super.onEnable();
        this.node.on(Node.EventType.CHILD_ADDED, this.onChildrenChanged, this);
        this.node.on(Node.EventType.CHILD_REMOVED, this.onChildrenChanged, this);
        this.node.on(Node.EventType.CHILDREN_ORDER_CHANGED, this.onChildrenChanged, this);
        this.node.on(Node.EventType.SIZE_CHANGED, this.onLayoutNodeChanged, this);
        this.node.on(Node.EventType.ANCHOR_CHANGED, this.onLayoutNodeChanged, this);
        this.node.on(Node.EventType.COMPONENT_ADDED, this.onLayoutNodeChanged, this);
        this.node.on(Node.EventType.COMPONENT_REMOVED, this.onLayoutNodeChanged, this);
        this.syncChildListeners();
    }
    protected onDisable(): void {
        this.releaseOwnedChildren();
        this.node.off(Node.EventType.CHILD_ADDED, this.onChildrenChanged, this);
        this.node.off(Node.EventType.CHILD_REMOVED, this.onChildrenChanged, this);
        this.node.off(Node.EventType.CHILDREN_ORDER_CHANGED, this.onChildrenChanged, this);
        this.node.off(Node.EventType.SIZE_CHANGED, this.onLayoutNodeChanged, this);
        this.node.off(Node.EventType.ANCHOR_CHANGED, this.onLayoutNodeChanged, this);
        this.node.off(Node.EventType.COMPONENT_ADDED, this.onLayoutNodeChanged, this);
        this.node.off(Node.EventType.COMPONENT_REMOVED, this.onLayoutNodeChanged, this);
        for (const child of this._observedChildren) this.unwatchChild(child);
        this._observedChildren.clear();
        super.onDisable();
    }
    private onLayoutNodeChanged(): void { if (!this._running) this.MarkDirty(); }
    private onChildrenChanged(child?: Node): void {
        // Cocos-Gizmos draws temporary DontSave nodes in Scene Editor:
        // these are not layout children and must not trigger a rebuild.
        if (child && (child.hideFlags & CCObject.Flags.DontSave) !== 0) return;
        if (this._running) return;
        if (child && child.parent !== this.node) {
            const state=LayoutBase.childStates.get(child);
            if (state && state.owner===this) LayoutBase.releaseChild(child,state);
        }
        this.syncChildListeners();
        this.MarkDirty();
    }
    private syncChildListeners(): void {
        const children = new Set(this.node.children.filter(c => (c.hideFlags & CCObject.Flags.DontSave) === 0));
        for (const child of this._observedChildren) if (!children.has(child)) {
            this.unwatchChild(child);
            this._observedChildren.delete(child);
        }
        for (const child of children) if (!this._observedChildren.has(child)) {
            this.watchChild(child);
            this._observedChildren.add(child);
        }
    }
    private watchChild(child: Node): void {
        child.on(Node.EventType.SIZE_CHANGED, this.onChildChanged, this);
        child.on(Node.EventType.ANCHOR_CHANGED, this.onChildChanged, this);
        child.on(Node.EventType.TRANSFORM_CHANGED, this.onChildTransform, this);
        child.on(Node.EventType.ACTIVE_CHANGED, this.onChildChanged, this);
        child.on(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED, this.onChildChanged, this);
        child.on(Node.EventType.COMPONENT_ADDED, this.onChildChanged, this);
        child.on(Node.EventType.COMPONENT_REMOVED, this.onChildChanged, this);
    }
    private unwatchChild(child: Node): void {
        child.off(Node.EventType.SIZE_CHANGED, this.onChildChanged, this);
        child.off(Node.EventType.ANCHOR_CHANGED, this.onChildChanged, this);
        child.off(Node.EventType.TRANSFORM_CHANGED, this.onChildTransform, this);
        child.off(Node.EventType.ACTIVE_CHANGED, this.onChildChanged, this);
        child.off(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED, this.onChildChanged, this);
        child.off(Node.EventType.COMPONENT_ADDED, this.onChildChanged, this);
        child.off(Node.EventType.COMPONENT_REMOVED, this.onChildChanged, this);
    }
    private onChildChanged(): void {
        if (this._running) return;
        this.captureEditedChildren();
        this.MarkDirty();
    }
    private onChildTransform(flags: number): void {
        if (this._running) return;
        if ((flags & Node.TransformBit.SCALE) !== 0) this.captureEditedChildren();
        // Position-only events may be emitted continuously by Lerp/Curve
        // animations; size-affecting transforms still invalidate layout.
        if ((flags & (Node.TransformBit.SCALE | Node.TransformBit.ROTATION)) !== 0) this.MarkDirty();
    }
    protected lateUpdate(): void {
        super.lateUpdate();
        if (!this._dirty || !this.autoUpdate || !this.enabledInHierarchy ||
            !this.isActiveLayoutOwner() || this.hasLayoutAncestor()) return;
        this.ForceUpdate();
    }
    public ForceUpdate(): void {
        if (this._running || !this.node.activeInHierarchy || !this.enabledInHierarchy ||
            !this.isActiveLayoutOwner()) return;
        this._running = true;
        try { const size = this.getCurrentSize(); this.arrangeChildren(size); this._dirty = false; }
        finally { this._running = false; }
    }
    protected hasLayoutAncestor(): boolean {
        for(let n=this.node.parent;n;n=n.parent){
            const active=n.getComponents(LayoutBase).filter(l=>l.enabledInHierarchy);
            const l=active[active.length-1];
            if(l && l.autoUpdate) return true;
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
    /** Child overrides take precedence over this layout's Fit Children toggle. */
    protected shouldFit(item: Item): boolean {
        const mode = item.object?.fitMode ?? FitMode.Inherit;
        return mode===FitMode.ScaleToFit || (mode===FitMode.Inherit && this.fitChildren);
    }
    /** Optional per-layout cap, 0 = use the supplied available bounds. */
    protected fitBounds(available: Vec3): Vec3 {
        return new Vec3(this.fitItemSize.x>0?Math.min(available.x,this.fitItemSize.x):available.x,
            this.fitItemSize.y>0?Math.min(available.y,this.fitItemSize.y):available.y,available.z);
    }
    /** Layouts that place centres on paths need an explicit per-item target.
     * Without Fit Item Size or child MaxSize, preserve natural visual size.
     */
    protected spatialFitBounds(item: Item, content: Vec3): Vec3 {
        const natural=this.fitNaturalSize(item,content);
        const base=this.baseScale(item.node),mult=item.object?.scaleMultiplier;
        const vx=natural.x*Math.abs(base.x*(mult?.x??1)),vy=natural.y*Math.abs(base.y*(mult?.y??1));
        const mx=item.object?.maxSize.x??0,my=item.object?.maxSize.y??0;
        return this.fitBounds(new Vec3(
            Math.min(content.x,this.fitItemSize.x>0?this.fitItemSize.x:mx>0?mx:vx),
            Math.min(content.y,this.fitItemSize.y>0?this.fitItemSize.y:my>0?my:vy),content.z));
    }
    /** Component/Fill use source content size, not a previously assigned Fill cell size. */
    protected fitNaturalSize(item: Item, inner: Vec3): Vec3 {
        const obj=item.object;
        const natural=defaultAdapter.measure(item.node);
        if(obj){
            const sx=obj.GetFitSourceSize(0),sy=obj.GetFitSourceSize(1);
            if(sx>0)natural.x=sx;
            if(sy>0)natural.y=sy;
        }
        const activeNested=item.node.getComponents(LayoutBase).filter(l=>l.enabledInHierarchy);
        const nested=activeNested[activeNested.length-1];
        if(nested && nested!==this && obj &&
            (obj.widthType===SizeType.Layout||obj.heightType===SizeType.Layout)){
            const intrinsic=nested.measureIntrinsic(inner);
            if(obj.widthType===SizeType.Layout)natural.x=intrinsic.x;
            if(obj.heightType===SizeType.Layout)natural.y=intrinsic.y;
        }
        if(obj?.widthType===SizeType.Fixed)natural.x=obj.fixed(0);
        if(obj?.heightType===SizeType.Fixed)natural.y=obj.fixed(1);
        return natural;
    }
    /** Apply a uniform absolute fit factor. Item outer becomes visual bounds for alignment. */
    protected fitItem(item: Item, bounds: Vec3, inner: Vec3, padding=this.fitPadding): FitResult {
        // Owner hand-off restores previous layout's scale/content before measuring.
        const base=this.baseScale(item.node);
        const natural=this.fitNaturalSize(item,inner);
        const ui=item.node.getComponent(UITransform);
        if(ui && (Math.abs(ui.width-natural.x)>0.0001||Math.abs(ui.height-natural.y)>0.0001))
            ui.setContentSize(natural.x,natural.y);
        const mult=item.object?.scaleMultiplier;
        const effective=new Vec3(base.x*(mult?.x??1),base.y*(mult?.y??1),base.z*(mult?.z??1));
        const pad=Math.max(0,padding);
        const availableWidth=Math.max(0,bounds.x-item.marginLeft-item.marginRight-2*pad);
        const availableHeight=Math.max(0,bounds.y-item.marginTop-item.marginBottom-2*pad);
        const factor=calculateFitScale(natural,effective,availableWidth,availableHeight,
            item.object?.minSize??new Vec3(),item.object?.maxSize??new Vec3());
        const visual=new Vec3(natural.x*Math.abs(effective.x)*factor,
            natural.y*Math.abs(effective.y)*factor,natural.z*Math.abs(effective.z)*factor);
        item.size.set(natural);
        item.outer.set(visual.x+item.marginLeft+item.marginRight+2*pad,
            visual.y+item.marginTop+item.marginBottom+2*pad,
            visual.z+item.marginFront+item.marginBack);
        return {scale:factor,visualSize:visual};
    }
    protected items(available: Vec3, measuringIntrinsic = false): Item[] {
        return this.node.children.filter(n=>(n.hideFlags & CCObject.Flags.DontSave)===0).filter(n=>this.includeInactive || n.active).filter(n=>!n.getComponent(FlexalonObject)?.skipLayout && !n.getComponent(FlexalonInteractable)?.IsDragging &&
            !(n.getComponent(FlexalonCurveAnimator)?.enabledInHierarchy && n.getComponent(FlexalonCurveAnimator)?.ignoreParentLayout)).map(n=>this.measureItem(n,available,measuringIntrinsic));
    }
    protected measureItem(node: Node, available: Vec3, measuringIntrinsic = false): Item {
        const obj=node.getComponent(FlexalonObject);
        const natural=defaultAdapter.measure(node);
        const activeNested=node.getComponents(LayoutBase).filter(l=>l.enabledInHierarchy);
        const nested=activeNested[activeNested.length-1];
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
    protected place(item: Item, outerCenter: Vec3, containerSize: Vec3, index = 0, rotation: Vec3 | null = null,
        fit?: FitResult): void {
        // Take ownership BEFORE any content-size or scale writes.
        const baseline=this.baseScale(item.node);
        const parentCenter=this.contentCenter(containerSize);
        let pos=outerCenter.clone();
        pos.x+=(item.marginLeft-item.marginRight)/2 + parentCenter.x;
        pos.y+=(item.marginBottom-item.marginTop)/2 + parentCenter.y;
        pos.z+=(item.marginBack-item.marginFront)/2 + parentCenter.z;
        const ui=item.node.getComponent(UITransform);
        const anchorSize = fit?.visualSize ?? item.size;
        if(ui){ pos.x+=(ui.anchorX-0.5)*anchorSize.x;pos.y+=(ui.anchorY-0.5)*anchorSize.y; }
        if(item.object) pos.add(item.object.offset);
        // Modifiers are only applied to computed layout positions, never cumulative.
        const mods=this.node.getComponents('Flexalon.FlexalonRandomModifier') as unknown as FlexalonModifier[];
        for(const mod of mods) if(typeof mod.modify==='function') pos=mod.modify(item.node,index,pos);
        const current=item.node.position;
        const animator=item.node.getComponent(FlexalonLerpAnimator);
        if(animator?.enabledInHierarchy) animator.moveTo(pos);
        else if(!FlexalonMath.VecApproximately(current,pos)) item.node.setPosition(pos);
        if(ui && !fit && !(item.object?.preserveUIContentSize)) {
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
        // Apply absolute scale from the ORIGINAL baseline. Switching Fit off
        // restores even children with no FlexalonObject.
        if(item.object || fit || LayoutBase.childStates.has(item.node)) {
            const mult=item.object?.scaleMultiplier;
            const factor=fit?.scale ?? 1;
            const target=new Vec3(baseline.x*(mult?.x ?? 1)*factor,
                baseline.y*(mult?.y ?? 1)*factor,baseline.z*(mult?.z ?? 1)*factor);
            if(!FlexalonMath.VecApproximately(item.node.scale,target))item.node.setScale(target);
        }
        this.recordPlacedChild(item.node);
        // No automatic multiplication of scale every frame.
        const result=item.node.getComponent(FlexalonResult);
        if(result){result.LayoutPosition.set(pos);result.LayoutSize.set(fit?.visualSize ?? item.size);result.LayoutRotation = q.clone();result.SiblingIndex=index;}
        const activeNested=item.node.getComponents(LayoutBase).filter(l=>l.enabledInHierarchy);
        const nested=activeNested[activeNested.length-1];
        if(nested && nested!==this) nested.arrangeChildren(item.size.clone());
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
