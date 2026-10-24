import { FlexalonObject } from '../Core/FlexalonObject';
import { _decorator, Vec3 } from 'cc';
import { LayoutBase } from '../Core/FlexalonLayoutBase';
import { FlexalonMath } from '../Core/FlexalonMath';
const {ccclass,property,menu,executeInEditMode,requireComponent}=_decorator;
@ccclass('Flexalon.FlexalonRandomLayout')
@menu('Flexalon/Random Layout')
@executeInEditMode
@requireComponent(FlexalonObject)
export class FlexalonRandomLayout extends LayoutBase {
    @property({tooltip: "Hạt ngẫu nhiên cố định; cùng Seed tạo cùng một bố cục.", visible: true}) public seed=12345;
    @property({ tooltip: "Phạm vi rải trên mỗi trục theo tỉ lệ kích thước nội dung (1 = 100%; 0 = không rải).", visible: true}) public normalizedExtent=new Vec3(1,1,0);
    public arrangeChildren(size:Vec3):void{
        const content=this.contentSize(size),random=FlexalonMath.Seeded(this.seed);
        this.items(content).forEach((i,k)=>this.place(i,new Vec3((random()-.5)*content.x*this.normalizedExtent.x,(random()-.5)*content.y*this.normalizedExtent.y,(random()-.5)*content.z*this.normalizedExtent.z),size,k));
    }
}
