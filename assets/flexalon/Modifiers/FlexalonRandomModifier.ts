import { _decorator, Vec3 } from 'cc';
import { FlexalonComponent } from '../Core/FlexalonComponent';
import { FlexalonModifier } from '../Core/FlexalonModifier';
import { FlexalonMath } from '../Core/FlexalonMath';
const { ccclass, property, menu, executeInEditMode }=_decorator;
/** Deterministic extra offsets, recomputed from each child's stable index. */
@ccclass('Flexalon.FlexalonRandomModifier')
@menu('Flexalon/Random Modifier')
@executeInEditMode
export class FlexalonRandomModifier extends FlexalonComponent implements FlexalonModifier {
    @property({tooltip: "Seed ngẫu nhiên cố định để Offset mỗi child tái hiện được.", visible: true}) public seed=347;
    @property({ tooltip: "Độ lệch vị trí tối đa ngẫu nhiên trên từng trục XYZ.", visible: true}) public positionRange=new Vec3(10,10,0);
    public modify(_node:any,index:number,position:Vec3):Vec3 {
        const rnd=FlexalonMath.Seeded((this.seed^Math.imul(index+1,0x45d9f3b))|0);
        return position.clone().add(new Vec3((rnd()*2-1)*this.positionRange.x,(rnd()*2-1)*this.positionRange.y,(rnd()*2-1)*this.positionRange.z));
    }
}
