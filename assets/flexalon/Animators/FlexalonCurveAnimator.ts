import { _decorator, CCFloat, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
import { FlexalonComponent } from '../Core/FlexalonComponent';
import { FlexalonMath } from '../Core/FlexalonMath';
import { syncGizmosSelection, flexalonGizmos, drawLocalCircle, drawLocalLineList, paddingColor, pathColor } from '../Core/FlexalonGizmos';
const { ccclass, property, menu, executeInEditMode } = _decorator;
/** Moves in the PARENT's local coordinates, so the path must also be drawn in parent-space. */
@ccclass('Flexalon.FlexalonCurveAnimator')
@executeInEditMode
@menu('Flexalon/Curve Animator')
export class FlexalonCurveAnimator extends FlexalonComponent {
    @property({ tooltip:'P0: gốc của đường Bézier trong local space của parent.',visible:true}) public p0=new Vec3(-100,0,0);
    @property({ tooltip:'Điểm điều khiển Bézier thứ nhất (parent-local).',visible:true}) public p1=new Vec3(-50,100,0);
    @property({ tooltip:'Điểm điều khiển Bézier thứ hai (parent-local).',visible:true}) public p2=new Vec3(50,-100,0);
    @property({ tooltip:'P3: điểm cuối đường Bézier (parent-local).',visible:true}) public p3=new Vec3(100,0,0);
    @property({tooltip:'Bật để đặt vị trí bắt đầu độc lập P0, dịch toàn bộ Bézier sao cho điểm đầu khớp Start Position.',visible:true}) public useStartPosition=false;
    @property({ tooltip:'Vị trí P0 thực tế trong local của parent.',visible:function(this:FlexalonCurveAnimator){return this.useStartPosition;}}) public startPosition=new Vec3(-100,0,0);
    @property({type:CCFloat,range:[0,1,0.01],slide:true,tooltip:'Điểm xuất phát trên curve: 0=P0, 1=P3.',visible:true}) public startProgress=0;
    @property({tooltip:'Đặt Node vào Start Progress khi chỉnh Scene mà không chạy animation.',visible:true}) public snapToStartInEditor=false;
    @property({tooltip:'Layout cha không sắp xếp node này. Bật khi Curve Animator điều khiển vị trí.',visible:true}) public ignoreParentLayout=false;
    @property({tooltip:'Thời gian đi hết đường cong gốc (giây).',visible:true}) public duration=2;
    @property({tooltip:'Lặp từ Start Progress tới P3.',visible:true}) public loop=true;
    @property({tooltip:'Tạm dừng chuyển động trong Editor/Runtime.',visible:true}) public paused=false;
    @property({tooltip:'Chạy thử animation trong Scene Editor (mặc định tắt).',visible:true}) public previewInEditor=false;
    @property({tooltip:'Hiện Gizmos khi chọn Node; cần Cocos-Gizmos v2.',visible:true}) public showGizmos=true;
    @property({type:CCFloat,range:[0,1,0.01],slide:true,tooltip:'Marker tham khảo trên đường cong; không di chuyển Node.',visible:true}) public previewProgress=0;

    private timer=0;
    private initialized=false;
    private dragPaused=false;
    private clampProgress(t:number):number {return Number.isFinite(t)?Math.max(0,Math.min(1,t)):0;}
    private safeDuration():number {return Math.max(0.001,Number.isFinite(this.duration)?this.duration:2);}
    private curveOffset():Vec3 {
        return this.useStartPosition?new Vec3(
            this.startPosition.x-this.p0.x,
            this.startPosition.y-this.p0.y,
            this.startPosition.z-this.p0.z):new Vec3();
    }
    public PointAt(t:number):Vec3 {
        return FlexalonMath.Bezier(this.p0,this.p1,this.p2,this.p3,this.clampProgress(t)).add(this.curveOffset());
    }
    public PlaceAtStart():void {
        if(!this.node || this.dragPaused)return;
        const p=this.PointAt(this.startProgress);
        if(!FlexalonMath.VecApproximately(this.node.position,p))this.node.setPosition(p);
    }
    public UseCurrentPositionAsStart():void {
        this.startPosition.set(this.node.position);
        this.useStartPosition=true;
        this.startProgress=0;
        this.Restart();
    }
    public Pause():void {this.paused=true;}
    public Resume():void {this.paused=false;}
    public Restart():void {
        this.timer=this.clampProgress(this.startProgress)*this.safeDuration();
        this.initialized=true;
        this.PlaceAtStart();
    }
    public SuspendForDrag():void {this.dragPaused=true;}
    public ResumeAfterDrag():void {this.dragPaused=false;}
    protected onEnable():void {
        this.timer=this.clampProgress(this.startProgress)*this.safeDuration();
        this.initialized=true;
        if(!EDITOR || this.previewInEditor || this.snapToStartInEditor)this.PlaceAtStart();
    }
    public onDrawGizmos():void {syncGizmosSelection(this.node);}
    public onDrawGizmosSelected():void {
        if(!this.showGizmos || !this.node?.parent)return;
        const parent=this.node.parent,g=flexalonGizmos();if(!g)return;
        const offset=this.curveOffset();
        const shift=(p:Vec3)=>Vec3.add(new Vec3(),p,offset);
        g.beginColor(parent,paddingColor);
        drawLocalLineList(g,parent,[shift(this.p0),shift(this.p1)]);
        drawLocalLineList(g,parent,[shift(this.p2),shift(this.p3)]);
        g.beginColor(parent,pathColor);
        drawLocalLineList(g,parent,Array.from({length:65},(_,i)=>this.PointAt(i/64)));
        for(const p of [this.p0,this.p1,this.p2,this.p3])drawLocalCircle(g,parent,shift(p),5);
        g.beginColor(parent,paddingColor);
        drawLocalCircle(g,parent,this.PointAt(this.startProgress),9);
        g.beginColor(parent,pathColor);
        drawLocalCircle(g,parent,this.PointAt(this.previewProgress),5);
    }
    protected update(dt:number):void {
        if(EDITOR && !this.previewInEditor) {
            if(this.snapToStartInEditor && !this.dragPaused)this.PlaceAtStart();
            return;
        }
        if(!this.initialized)this.Restart();
        if(this.paused || this.dragPaused)return;
        const duration=this.safeDuration();
        const start=this.clampProgress(this.startProgress)*duration;
        const delta=Math.max(0,Number.isFinite(dt)?dt:0);
        const current=Math.max(start,Math.min(duration,this.timer));
        const remaining=duration-start;
        if(this.loop && remaining>0.000001)this.timer=start+(current-start+delta)%remaining;
        else this.timer=Math.min(duration,current+delta);
        const pos=this.PointAt(this.timer/duration);
        if(!FlexalonMath.VecApproximately(this.node.position,pos))this.node.setPosition(pos);
    }
}
