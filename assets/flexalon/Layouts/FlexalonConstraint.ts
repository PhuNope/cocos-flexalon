import { _decorator, Node, Vec3, Quat } from 'cc';
import { FlexalonComponent } from '../Core/FlexalonComponent';
import { FlexalonMath } from '../Core/FlexalonMath';
const {ccclass,property,menu,executeInEditMode}=_decorator;
/** Basic transform constraint: follows target in world space, optionally copies rotation. */
@ccclass('Flexalon.FlexalonConstraint')
@menu('Flexalon/Constraint')
@executeInEditMode
export class FlexalonConstraint extends FlexalonComponent {
    @property({type:Node, tooltip: "Node mục tiêu mà Constraint sẽ bám theo; bỏ trống thì không theo ai.", visible: true}) public target:Node|null=null;
    @property({ tooltip: "Vector cộng thêm vào vị trí thế giới của node mục tiêu.", visible: true}) public worldOffset=new Vec3();
    @property({tooltip: "Nếu bật thì đồng bộ rotation thế giới với node mục tiêu.", visible: true}) public followRotation=false;
    protected lateUpdate():void{this.ForceUpdate();}
    public ForceUpdate():void{
        if(!this.target || !this.target.isValid || this.node===this.target)return;
        const newPos=this.target.worldPosition.clone().add(this.worldOffset);
        if(!FlexalonMath.VecApproximately(this.node.worldPosition,newPos))this.node.setWorldPosition(newPos);
        if(this.followRotation && !Quat.equals(this.node.worldRotation,this.target.worldRotation))this.node.setWorldRotation(this.target.worldRotation);
    }
}
