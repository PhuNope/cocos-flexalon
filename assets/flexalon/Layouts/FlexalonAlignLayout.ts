import { FlexalonObject } from '../Core/FlexalonObject';
import { _decorator, Enum, Vec3 } from 'cc';
import { LayoutBase } from '../Core/FlexalonLayoutBase';
import { Align } from '../Core/FlexalonTypes';
const {ccclass, property, menu, executeInEditMode,requireComponent}=_decorator;
@ccclass('Flexalon.FlexalonAlignLayout')
@menu('Flexalon/Align Layout')
@executeInEditMode
@requireComponent(FlexalonObject)
export class FlexalonAlignLayout extends LayoutBase {
    @property({type:Enum(Align), tooltip: "Canh các child theo chiều ngang vùng chứa.", visible: true}) public horizontalAlign: Align = Align.Center;
    @property({type:Enum(Align), tooltip: "Canh các child theo chiều dọc vùng chứa.", visible: true}) public verticalAlign: Align = Align.Center;
    @property({type:Enum(Align), tooltip: "Canh các child theo chiều sâu Z vùng chứa.", visible: true}) public depthAlign: Align = Align.Center;
    public arrangeChildren(size: Vec3): void {
        const content=this.contentSize(size);
        this.items(content).forEach((i,index)=>{
            this.place(i,new Vec3(this.aligned(content.x,i.outer.x,this.horizontalAlign),this.aligned(content.y,i.outer.y,this.verticalAlign),this.aligned(content.z,i.outer.z,this.depthAlign)),size,index);
        });
    }
}
