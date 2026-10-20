import { _decorator, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { FlexalonComponent } from '../Core/FlexalonComponent';
import { FlexalonMath } from '../Core/FlexalonMath';
import { flexalonGizmos, drawLocalCircle, drawLocalLineList, paddingColor, pathColor } from '../Core/FlexalonGizmos';
const { ccclass, property, menu, executeInEditMode } = _decorator;
/** Moves in the PARENT's local coordinates, so the path must also be drawn in parent-space. */
@ccclass('Flexalon.FlexalonCurveAnimator')
@executeInEditMode
@menu('Flexalon/Curve Animator')
export class FlexalonCurveAnimator extends FlexalonComponent {
    @property({type:Vec3, tooltip: 'Điểm bắt đầu của Bézier (local của parent).', visible:true}) public p0=new Vec3(-100,0,0);
    @property({type:Vec3, tooltip: 'Điểm điều khiển thứ nhất (local của parent).', visible:true}) public p1=new Vec3(-50,100,0);
    @property({type:Vec3, tooltip: 'Điểm điều khiển thứ hai (local của parent).', visible:true}) public p2=new Vec3(50,-100,0);
    @property({type:Vec3, tooltip: 'Điểm kết thúc của Bézier (local của parent).', visible:true}) public p3=new Vec3(100,0,0);
    @property({tooltip: 'Thời gian hoàn tất một lượt chuyển động (giây).',visible:true}) public duration=2;
    @property({tooltip: 'Lặp lại sau khi chuyển động đến cuối đường.',visible:true}) public loop=true;
    @property({tooltip: 'Tạm dừng chuyển động trong Editor và Runtime. Không cần disable Component để xem Gizmos.',visible:true}) public paused=false;
    @property({tooltip: 'Mặc định TẮT để đối tượng đứng yên khi chỉnh Scene; bật để chạy thử trong Editor.',visible:true}) public previewInEditor=false;
    @property({tooltip: 'Hiện Bézier và control points khi chọn Node (cần extension Cocos-Gizmos).',visible:true}) public showGizmos=true;
    @property({tooltip: 'Đánh dấu vị trí preview trên đường cong [0..1], không tự di chuyển Node.',visible:true}) public previewProgress=0;

    private timer=0;
    private dragPaused=false;
    public Pause():void {this.paused=true;}
    public Resume():void {this.paused=false;}
    public Restart():void {this.timer=0;}
    public SuspendForDrag():void {this.dragPaused=true;}
    public ResumeAfterDrag():void {this.dragPaused=false;}

    public onDrawGizmos():void { /* selected-only */ }
    public onDrawGizmosSelected():void {
        if(!this.showGizmos || !this.node?.parent)return;
        const parent=this.node.parent;
        const g=flexalonGizmos();if(!g)return;
        // Animator writes node.position in its PARENT coordinate system. Drawing
        // on this.node would incorrectly move the curve with the animated item.
        g.beginColor(parent,paddingColor);
        drawLocalLineList(g,parent,[this.p0,this.p1]);
        drawLocalLineList(g,parent,[this.p2,this.p3]);
        g.beginColor(parent,pathColor);
        drawLocalLineList(g,parent,Array.from({length:65},(_,i)=>
            FlexalonMath.Bezier(this.p0,this.p1,this.p2,this.p3,i/64)));
        for(const p of [this.p0,this.p1,this.p2,this.p3])drawLocalCircle(g,parent,p,5);
        const t=Math.max(0,Math.min(1,this.previewProgress));
        drawLocalCircle(g,parent,FlexalonMath.Bezier(this.p0,this.p1,this.p2,this.p3,t),8);
    }
    protected update(dt:number):void {
        // @executeInEditMode is used for Gizmos; never animate a scene being
        // authored unless Preview In Editor is explicitly enabled.
        if(this.paused || this.dragPaused || (EDITOR && !this.previewInEditor))return;
        const duration=Math.max(0.001,this.duration);
        this.timer=this.loop?(this.timer+Math.max(0,dt))%duration:
            Math.min(duration,this.timer+Math.max(0,dt));
        const pos=FlexalonMath.Bezier(this.p0,this.p1,this.p2,this.p3,this.timer/duration);
        if(!FlexalonMath.VecApproximately(this.node.position,pos))this.node.setPosition(pos);
    }
}
