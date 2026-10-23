import { _decorator, Canvas, CCObject, Node, EventTouch, UITransform, Vec3 } from 'cc';
import { FlexalonComponent } from '../Core/FlexalonComponent';
import { FlexalonObject } from '../Core/FlexalonObject';
import { FlexalonLerpAnimator } from '../Animators/FlexalonLerpAnimator';
import { FlexalonCurveAnimator } from '../Animators/FlexalonCurveAnimator';
import { FlexalonDragTarget } from './FlexalonDragTarget';
const {ccclass,property,menu,requireComponent}= _decorator;

/** Drag UI elements across nested layouts. UITransform is needed for hit events. */
@ccclass('Flexalon.FlexalonInteractable')
@requireComponent(UITransform)
@menu('Flexalon/Interactable')
export class FlexalonInteractable extends FlexalonComponent {
    @property({tooltip: 'Cho phép kéo thả Node UI bằng chuột hoặc touch.',visible:true}) public dragEnabled=true;
    @property({tooltip: 'Chuyển tạm child lên Canvas khi kéo để thoát Mask/ScrollView và nested layout.',visible:true}) public detachWhileDragging=true;
    @property({tooltip: 'Khi thả bên ngoài parent và không có Drop Target, giữ Node dưới Canvas. Tắt để trả về parent cũ.',visible:true}) public keepOutsideOnRelease=true;

    @property({tooltip: 'Kéo và thả vào layout cũ sẽ đổi sibling order (Flexible/Grid/Shape/...)',visible:true}) public reorderWithinLayout=true;

    private dragging=false;
    private moved=false;
    private detached=false;
    private originalParent:Node|null=null;
    private originalIndex=0;
    private originalSkip=false;
    private startWorld=new Vec3();
    private startPointer=new Vec3();
    private startLocal=new Vec3();
    private touchId:number|null=null;

    /** LayoutBase reads this, even if the child does not have FlexalonObject. */
    public get IsDragging():boolean{return this.dragging;}

    /**
     * The dragged Node can move to Canvas before being dropped. Invalidating
     * only this.node.parent would miss its original layout. Find the closest
     * layout at each location, then let LayoutBase.MarkDirty bubble upwards.
     * No direct ForceUpdate here: multiple input events coalesce in lateUpdate.
     */
    private markLayoutDirty(from: Node | null): void {
        for (let parent = from; parent; parent = parent.parent) {
            const layout = parent.getComponents(FlexalonComponent).find(component => {
                const candidate = component as FlexalonComponent & {
                    arrangeChildren?: unknown; measureIntrinsic?: unknown;
                };
                return component.enabledInHierarchy &&
                    typeof candidate.arrangeChildren === 'function' &&
                    typeof candidate.measureIntrinsic === 'function';
            });
            if (layout) { layout.MarkDirty(); return; }
        }
    }

    protected onEnable():void {
        super.onEnable();
        this.node.on(Node.EventType.TOUCH_START,this.startDrag,this);
        this.node.on(Node.EventType.TOUCH_MOVE,this.moveDrag,this);
        this.node.on(Node.EventType.TOUCH_END,this.endDrag,this);
        this.node.on(Node.EventType.TOUCH_CANCEL,this.cancelDrag,this);
    }
    protected onDisable():void {
        this.node.off(Node.EventType.TOUCH_START,this.startDrag,this);
        this.node.off(Node.EventType.TOUCH_MOVE,this.moveDrag,this);
        this.node.off(Node.EventType.TOUCH_END,this.endDrag,this);
        this.node.off(Node.EventType.TOUCH_CANCEL,this.cancelDrag,this);
        this.finishDrag(null,false);
        super.onDisable();
    }

    private pointer(e:EventTouch):Vec3 {
        const p=e.getUILocation();return new Vec3(p.x,p.y,0);
    }
    private matchesTouch(e:EventTouch):boolean {
        return this.touchId === (e.getID() ?? null);
    }
    private findCanvas():Node|null {
        for(let p:Node|null=this.node.parent;p;p=p.parent) {
            if(p.getComponent(Canvas))return p;
        }
        return null;
    }
    private startDrag(e:EventTouch):void {
        if(!this.dragEnabled || this.dragging || !this.node.parent)return;
        for(let hit:Node|null=e.target as Node;hit && hit!==this.node;hit=hit.parent) {
            if(hit.getComponent(FlexalonInteractable)?.enabledInHierarchy)return;
        }
        const parentUI=this.node.parent.getComponent(UITransform);
        if(!parentUI)return;
        this.dragging=true;this.moved=false;this.detached=false;
        this.originalParent=this.node.parent;
        this.originalIndex=this.node.getSiblingIndex();
        this.startWorld.set(this.node.worldPosition);
        this.startLocal.set(this.node.position);
        this.startPointer.set(parentUI.convertToNodeSpaceAR(this.pointer(e)));
        this.touchId=e.getID()??null;
        const obj=this.node.getComponent(FlexalonObject);
        this.originalSkip=obj?.skipLayout??false;
        if(obj)obj.skipLayout=true;
        this.node.getComponent(FlexalonLerpAnimator)?.SuspendForDrag();
        this.node.getComponent(FlexalonCurveAnimator)?.SuspendForDrag();
        // Explicit invalidation is required even without a FlexalonObject:
        // IsDragging is runtime state, not a Node transform/size event.
        this.markLayoutDirty(this.originalParent);
        e.propagationStopped=true;
    }
    private moveDrag(e:EventTouch):void {
        if(!this.dragging || !this.matchesTouch(e))return;
        const origin=this.originalParent;
        const ui=origin?.getComponent(UITransform);
        if(!origin || !ui)return;
        const pointerLocal=ui.convertToNodeSpaceAR(this.pointer(e));
        const dx=pointerLocal.x-this.startPointer.x,dy=pointerLocal.y-this.startPointer.y;
        if(!this.moved && dx*dx+dy*dy<1)return;
        this.moved=true;
        if(!this.detached && this.detachWhileDragging) {
            const canvas=this.findCanvas();
            if(canvas && canvas!==this.originalParent && canvas!==this.node) {
                this.node.setParent(canvas,true);
                this.detached=true;
            }
        }
        const desiredLocal=this.startLocal.clone();
        desiredLocal.x+=dx;desiredLocal.y+=dy;
        const next=new Vec3();Vec3.transformMat4(next,desiredLocal,origin.worldMatrix);
        this.node.setWorldPosition(next);
        e.propagationStopped=true;
    }
    private endDrag(e:EventTouch):void {
        if(!this.dragging || !this.matchesTouch(e))return;
        this.finishDrag(e,true);
    }
    private cancelDrag(e:EventTouch):void {
        if(!this.dragging || !this.matchesTouch(e))return;
        this.finishDrag(e,false);
    }
    private isDescendantOf(node:Node,ancestor:Node):boolean {
        for(let p:Node|null=node;p;p=p.parent)if(p===ancestor)return true;
        return false;
    }
    private containsPointer(node:Node,point:Vec3):boolean {
        const ui=node.getComponent(UITransform);if(!ui)return false;
        const p=ui.convertToNodeSpaceAR(point);
        return p.x>=-ui.anchorX*ui.width && p.x<=(1-ui.anchorX)*ui.width &&
               p.y>=-ui.anchorY*ui.height && p.y<=(1-ui.anchorY)*ui.height;
    }
    private findDropTarget(point:Vec3):FlexalonDragTarget|null {
        let root:Node=this.node;
        while(root.parent)root=root.parent;
        const visit=(node:Node):FlexalonDragTarget|null=>{
            if(!node.activeInHierarchy || this.isDescendantOf(node,this.node))return null;
            for(let i=node.children.length-1;i>=0;i--){
                const hit=visit(node.children[i]);if(hit)return hit;
            }
            const target=node.getComponent(FlexalonDragTarget);
            return target?.enabledInHierarchy && target.CanAccept(this.node) && this.containsPointer(node,point)?target:null;
        };
        return visit(root);
    }
    /** Reordering is a sibling-index operation, not a change to local position:
     * the layout owns item positions and recomputes them from child order.
     * Draw/drop coordinates are UI/world coordinates, so scaled/rotated parents
     * do not need separate screen-axis heuristics.
     */
    private reorderAt(parent:Node,point:Vec3):boolean {
        if(!parent.getComponent('Flexalon.LayoutBase'))return false;
        const siblings=parent.children.filter(c=>c!==this.node &&
            (c.hideFlags & CCObject.Flags.DontSave)===0 && c.active &&
            !c.getComponent(FlexalonObject)?.skipLayout &&
            !c.getComponent(FlexalonInteractable)?.IsDragging);
        if(!siblings.length)return false;
        const center=(n:Node):Vec3=>{
            const ui=n.getComponent(UITransform);
            const p=new Vec3(ui?(0.5-ui.anchorX)*ui.width:0,
                             ui?(0.5-ui.anchorY)*ui.height:0,0);
            const world=new Vec3();Vec3.transformMat4(world,p,n.worldMatrix);
            return world;
        };
        const centers=siblings.map(center);
        let nearest=0,best=Infinity;
        for(let i=0;i<centers.length;i++){
            const dx=point.x-centers[i].x,dy=point.y-centers[i].y;
            const distance=dx*dx+dy*dy;
            if(distance<best){best=distance;nearest=i;}
        }
        const pivot=centers[nearest];
        const direction=centers[Math.min(nearest+1,centers.length-1)];
        const previous=centers[Math.max(0,nearest-1)];
        let vx=direction.x-pivot.x,vy=direction.y-pivot.y;
        if(vx*vx+vy*vy<0.001){vx=pivot.x-previous.x;vy=pivot.y-previous.y;}
        const after=(point.x-pivot.x)*vx+(point.y-pivot.y)*vy>0;
        // Read sibling index before reparenting; a dragged child may temporarily
        // be under Canvas rather than its original Flexalon layout.
        if(this.node.parent!==parent)this.node.setParent(parent,true);
        const neighbour=siblings[nearest];
        const from=this.node.getSiblingIndex();
        let to=neighbour.getSiblingIndex()+(after?1:0);
        if(from<to)to--;
        this.node.setSiblingIndex(to);
        return true;
    }
    private finishDrag(e:EventTouch|null,allowDrop:boolean):void {
        if(!this.dragging)return;
        const origin=this.originalParent;
        try {
        const point=e?this.pointer(e):null;
        const target=allowDrop && this.moved && point?this.findDropTarget(point):null;
        const inOrigin=!!(point && origin && origin.getComponent(UITransform) && this.containsPointer(origin,point));
        // Explicit targets on other nodes take priority; the origin's own drop
        // target must not swallow a simple reorder within the same layout.
        if(target && target.node!==origin) {
            target.onDrop(this.node);
        } else if(allowDrop && this.moved && point && origin && inOrigin &&
                  this.reorderWithinLayout && this.reorderAt(origin,point)) {
            // Order is now persisted using Node.setSiblingIndex().
        } else if(target) {
            target.onDrop(this.node);
        } else {
            const outside=!!(point && origin && origin.getComponent(UITransform) && !inOrigin);
            let keep=this.moved && allowDrop && this.keepOutsideOnRelease && outside;
            if(keep && !this.detached){
                const canvas=this.findCanvas();
                if(canvas && canvas!==origin){this.node.setParent(canvas,true);this.detached=true;}
                else keep=false;
            }
            if(!keep && origin && this.node.parent!==origin) {
                this.node.setParent(origin,true);
                this.node.setSiblingIndex(Math.min(this.originalIndex,origin.children.length-1));
            }
            if(!allowDrop && origin) {
                if(this.node.parent===origin)this.node.setSiblingIndex(this.originalIndex);
                this.node.setWorldPosition(this.startWorld);
            } else if(!this.moved && origin) {
                this.node.setWorldPosition(this.startWorld);
            }
        }
        } finally {
            // Release / cancel / disable (and even a failing custom DropTarget)
            // must restore drag ownership and invalidate BOTH layout trees.
            this.dragging=false;
            const obj=this.node.getComponent(FlexalonObject);
            if(obj)obj.skipLayout=this.originalSkip;
            try {
                this.node.getComponent(FlexalonLerpAnimator)?.ResumeAfterDrag();
                this.node.getComponent(FlexalonCurveAnimator)?.ResumeAfterDrag();
            } finally {
                this.originalParent=null;
                this.touchId=null;
                this.detached=false;
                this.markLayoutDirty(origin);
                this.markLayoutDirty(this.node.parent);
                if(e)e.propagationStopped=true;
            }
        }
    }
}
