import { _decorator, Node, EventTouch, UITransform, Vec3 } from 'cc';
import { FlexalonComponent } from '../Core/FlexalonComponent';
import { FlexalonObject } from '../Core/FlexalonObject';
const {ccclass,property,menu}=_decorator;
/** 2D UI dragging. A parent UITransform is required for coordinate conversion. */
@ccclass('Flexalon.FlexalonInteractable')
@menu('Flexalon/Interactable')
export class FlexalonInteractable extends FlexalonComponent {
    @property({tooltip: "Cho phép kéo thả node UI bằng pointer; khi kéo, tạm bỏ qua layout cha.", visible: true}) public dragEnabled=true;
    private dragging=false;
    private startLocal=new Vec3();
    private startPointer=new Vec3();
    private wasSkipped=false;
    protected onEnable():void {
        this.node.on(Node.EventType.TOUCH_START,this.startDrag,this);
        this.node.on(Node.EventType.TOUCH_MOVE,this.moveDrag,this);
        this.node.on(Node.EventType.TOUCH_END,this.endDrag,this);
        this.node.on(Node.EventType.TOUCH_CANCEL,this.endDrag,this);
    }
    protected onDisable():void {
        this.node.off(Node.EventType.TOUCH_START,this.startDrag,this);
        this.node.off(Node.EventType.TOUCH_MOVE,this.moveDrag,this);
        this.node.off(Node.EventType.TOUCH_END,this.endDrag,this);
        this.node.off(Node.EventType.TOUCH_CANCEL,this.endDrag,this);
        this.endDrag();
    }
    private localPointer(e:EventTouch):Vec3|null {
        const ui=this.node.parent?.getComponent(UITransform);if(!ui)return null;
        const p=e.getUILocation();return ui.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
    }
    private startDrag(e:EventTouch):void {
        if(!this.dragEnabled)return;const p=this.localPointer(e);if(!p)return;
        this.dragging=true;this.startLocal.set(this.node.position);this.startPointer.set(p);
        const obj=this.node.getComponent(FlexalonObject);
        if(obj){this.wasSkipped=obj.skipLayout;obj.skipLayout=true;}
    }
    private moveDrag(e:EventTouch):void {
        if(!this.dragging)return;const p=this.localPointer(e);if(!p)return;
        const next=new Vec3(this.startLocal.x+p.x-this.startPointer.x,this.startLocal.y+p.y-this.startPointer.y,this.startLocal.z);
        this.node.setPosition(next);
    }
    private endDrag():void {
        if(!this.dragging)return;this.dragging=false;
        const obj=this.node.getComponent(FlexalonObject);if(obj)obj.skipLayout=this.wasSkipped;
    }
}
