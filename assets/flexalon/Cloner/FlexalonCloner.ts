import { _decorator, Prefab, instantiate, Node } from 'cc';
import { FlexalonComponent } from '../Core/FlexalonComponent';
const { ccclass, property, menu, executeInEditMode }=_decorator;
/** Instantiate children from a Prefab. Use Rebuild() explicitly; optional rebuild on start. */
@ccclass('Flexalon.FlexalonCloner')
@menu('Flexalon/Cloner')
@executeInEditMode
export class FlexalonCloner extends FlexalonComponent {
    @property({type:Prefab, tooltip: "Prefab được nhân bản thành các child của node hiện tại.", visible: true}) public prefab:Prefab|null=null;
    @property({tooltip: "Số bản sao khi gọi Rebuild() (giới hạn 0–1000).", visible: true}) public count=5;
    @property({tooltip: "Tự nhân bản từ Prefab khi chạy scene.", visible: true}) public rebuildOnStart=false;
    /** Prefix is used to identify cloner-managed instances without touching other children. */
    @property({tooltip: "Tiền tố tên node do Cloner sinh ra để Clear() chỉ xóa bản sao được quản lý.", visible: true}) public generatedPrefix='__flexalon_clone_';
    protected start():void {if(this.rebuildOnStart)this.Rebuild();}
    public Rebuild():void {
        if(!this.prefab)return;
        this.Clear();
        for(let i=0;i<Math.max(0,Math.min(1000,Math.floor(this.count)));i++){
            const child=instantiate(this.prefab) as Node;
            child.name=`${this.generatedPrefix}${i}`;
            child.parent=this.node;
        }
        this.MarkDirty();
    }
    public Clear():void {
        for(const child of [...this.node.children]) if(child.name.startsWith(this.generatedPrefix))child.destroy();
        this.MarkDirty();
    }
}
