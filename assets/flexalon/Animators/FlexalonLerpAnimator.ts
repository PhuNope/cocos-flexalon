import { _decorator, Vec3 } from 'cc';
import { FlexalonComponent } from '../Core/FlexalonComponent';
import { FlexalonMath } from '../Core/FlexalonMath';
const { ccclass, property, menu, executeInEditMode }=_decorator;
/** Optional smooth-motion adapter. LayoutBase hands target positions to this component. */
@ccclass('Flexalon.FlexalonLerpAnimator')
@menu('Flexalon/Lerp Animator')
@executeInEditMode
export class FlexalonLerpAnimator extends FlexalonComponent {
    @property({tooltip: "Tốc độ nội suy để node tiến đến vị trí do layout cung cấp.", visible: true}) public speed=12;
    @property({tooltip: "Khi còn cách đích ít hơn ngưỡng này thì đặt node tới đích ngay.", visible: true}) public snapDistance=0.01;
    private target:Vec3|null=null;
    private dragPaused=false;
    /** Discard previous layout target while user controls the Node. */
    public SuspendForDrag():void {this.dragPaused=true;this.target=null;}
    public ResumeAfterDrag():void {this.dragPaused=false;this.target=null;}
    public moveTo(p:Vec3):void {if(!this.dragPaused)this.target=p.clone();}
    protected update(dt:number):void {
        if(this.dragPaused || !this.target || !this.enabledInHierarchy)return;
        const alpha=1-Math.exp(-Math.max(0,this.speed)*Math.max(0,dt));
        const next=new Vec3(); Vec3.lerp(next,this.node.position,this.target,alpha);
        if(Vec3.distance(next,this.target)<this.snapDistance){next.set(this.target);this.target=null;}
        if(!FlexalonMath.VecApproximately(this.node.position,next))this.node.setPosition(next);
    }
    protected onDisable():void {this.target=null;this.dragPaused=false;}
}
