import { _decorator, Vec3 } from 'cc';
import { FlexalonComponent } from '../Core/FlexalonComponent';
import { FlexalonMath } from '../Core/FlexalonMath';
const { ccclass, property, menu }=_decorator;
/** Runtime-only animation along a cubic path; independent of layout positions. */
@ccclass('Flexalon.FlexalonCurveAnimator')
@menu('Flexalon/Curve Animator')
export class FlexalonCurveAnimator extends FlexalonComponent {
    @property({type:Vec3, tooltip: "Điểm bắt đầu của đường chuyển động Bézier.", visible: true}) public p0=new Vec3(-100,0,0);
    @property({type:Vec3, tooltip: "Điểm điều khiển Bézier thứ nhất.", visible: true}) public p1=new Vec3(-50,100,0);
    @property({type:Vec3, tooltip: "Điểm điều khiển Bézier thứ hai.", visible: true}) public p2=new Vec3(50,-100,0);
    @property({type:Vec3, tooltip: "Điểm kết thúc của đường chuyển động Bézier.", visible: true}) public p3=new Vec3(100,0,0);
    @property({tooltip: "Thời gian hoàn tất một lượt chuyển động (giây).", visible: true}) public duration=2;
    @property({tooltip: "Lặp chuyển động khi hết thời lượng.", visible: true}) public loop=true;
    private timer=0;
    protected update(dt:number):void {
        const duration=Math.max(0.001,this.duration);
        this.timer=this.loop?(this.timer+dt)%duration:Math.min(duration,this.timer+dt);
        const pos=FlexalonMath.Bezier(this.p0,this.p1,this.p2,this.p3,this.timer/duration);
        if(!FlexalonMath.VecApproximately(this.node.position,pos))this.node.setPosition(pos);
    }
}
