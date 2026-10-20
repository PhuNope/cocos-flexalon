import { _decorator, Canvas, Node, EventTouch, UITransform, Vec3 } from 'cc';
import { FlexalonComponent } from '../Core/FlexalonComponent';
import { FlexalonObject } from '../Core/FlexalonObject';
import { FlexalonLerpAnimator } from '../Animators/FlexalonLerpAnimator';
import { FlexalonDragTarget } from './FlexalonDragTarget';
const {ccclass,property,menu}= _decorator;

/** Drag UI elements across nested layouts. UITransform is needed for hit events. */
@ccclass('Flexalon.FlexalonInteractable')
@menu('Flexalon/Interactable')
export class FlexalonInteractable extends FlexalonComponent {
    @property({tooltip: 'Cho phép kéo thả Node UI bằng chuột hoặc touch.',visible:true}) public dragEnabled=true;
    @property({tooltip: 'Chuyển tạm child lên Canvas khi kéo để thoát Mask/ScrollView và nested layout.',visible:true}) public detachWhileDragging=true;
    @property({tooltip: 'Khi thả bên ngoài parent và không có Drop Target, giữ Node dưới Canvas. Tắt để trả về parent cũ.',visible:true}) public keepOutsideOnRelease=true;

    private dragging=false;
    private moved=false;
    private detached=false;
    private originalParent:Node|null=null;
    private originalIndex=0;
    private originalSkip=false;
    private startWorld=new Vec3();
    private startPointer=new Vec3();
    private touchId:number|null=null;

    /** LayoutBase reads this, even if the child does not have FlexalonObject. */
    public get IsDragging():boolean{return this.dragging;}

    protected onEnable():void {
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
        if(e.target !== this.node)return; // Prevent an ancestor Interactable also dragging.
        this.dragging=true;this.moved=false;this.detached=false;
        this.originalParent=this.node.parent;
        this.originalIndex=this.node.getSiblingIndex();
        this.startWorld.set(this.node.worldPosition);
        this.startPointer.set(this.pointer(e));
        this.touchId=e.getID()??null;
        const obj=this.node.getComponent(FlexalonObject);
        this.originalSkip=obj?.skipLayout??false;
        if(obj)obj.skipLayout=true;
        this.node.getComponent(FlexalonLerpAnimator)?.SuspendForDrag();
        e.propagationStopped=true;
    }
    private moveDrag(e:EventTouch):void {
        if(!this.dragging || !this.matchesTouch(e))return;
        const p=this.pointer(e);
        const dx=p.x-this.startPointer.x,dy=p.y-this.startPointer.y;
        if(!this.moved && dx*dx+dy*dy<1)return;
        this.moved=true;
        if(!this.detached && this.detachWhileDragging) {
            const canvas=this.findCanvas();
            if(canvas && canvas!==this.originalParent && canvas!==this.node) {
                this.node.setParent(canvas,true);
                this.detached=true;
            }
        }
        const next=this.startWorld.clone();next.x+=dx;next.y+=dy;
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
    private finishDrag(e:EventTouch|null,allowDrop:boolean):void {
        if(!this.dragging)return;
        const origin=this.originalParent;
        const point=e?this.pointer(e):null;
        const target=allowDrop && this.moved && point?this.findDropTarget(point):null;
        if(target) {
            target.onDrop(this.node);
        } else {
            const outside=!!(point && origin && origin.getComponent(UITransform) && !this.containsPointer(origin,point));
            const keep=this.detached && this.moved && allowDrop &&
                this.keepOutsideOnRelease && outside;
            if(!keep && origin && this.node.parent!==origin) {
                this.node.setParent(origin,true);
                this.node.setSiblingIndex(Math.min(this.originalIndex,origin.children.length-1));
            }
            if(!keep && !target && !this.moved && origin) {
                this.node.setWorldPosition(this.startWorld);
            }
        }
        this.dragging=false;
        const obj=this.node.getComponent(FlexalonObject);
        if(obj)obj.skipLayout=this.originalSkip;
        this.node.getComponent(FlexalonLerpAnimator)?.ResumeAfterDrag();
        this.originalParent=null;this.touchId=null;this.detached=false;
        if(e)e.propagationStopped=true;
    }
}
