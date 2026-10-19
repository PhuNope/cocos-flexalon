import { _decorator, UITransform } from 'cc';
import { FlexalonComponent } from '../Core/FlexalonComponent';
const {ccclass,property,menu,executeInEditMode}=_decorator;
/** Maintains UITransform width/height ratio (not for objects simultaneously sized by a Layout). */
@ccclass('Flexalon.FlexalonAspectRatioAdapter')
@menu('Flexalon/Aspect Ratio Adapter')
@executeInEditMode
export class FlexalonAspectRatioAdapter extends FlexalonComponent {
    @property({tooltip: "Tỉ lệ Width/Height mong muốn (phải lớn hơn 0).", visible: true}) public aspectRatio=1;
    @property({tooltip: "Bật: giữ Width và chỉnh Height; tắt: giữ Height và chỉnh Width.", visible: true}) public driveHeight=true;
    protected lateUpdate():void {
        const ui=this.getComponent(UITransform);if(!ui || this.aspectRatio<=0)return;
        if(this.driveHeight){const h=ui.width/this.aspectRatio;if(Math.abs(ui.height-h)>0.001)ui.setContentSize(ui.width,h);}
        else {const w=ui.height*this.aspectRatio;if(Math.abs(ui.width-w)>0.001)ui.setContentSize(w,ui.height);}
    }
}
