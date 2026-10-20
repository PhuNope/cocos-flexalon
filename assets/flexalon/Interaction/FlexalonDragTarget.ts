import { _decorator, Component, Node, UITransform } from 'cc';
import { flexalonGizmos, rect, marginColor } from '../Core/FlexalonGizmos';
const {ccclass,property,menu}=_decorator;
/** Drop zone placeholder: use CanAccept and onDrop to integrate into game-specific drag/drop logic. */
@ccclass('Flexalon.FlexalonDragTarget')
@menu('Flexalon/Drag Target')
export class FlexalonDragTarget extends Component {
    @property({tooltip: 'Vẽ vùng nhận Drop khi chọn Node (cần Cocos-Gizmos v2).',visible:true})
    public showGizmos=true;
    public onDrawGizmos():void {/* selected only */}
    public onDrawGizmosSelected():void {
      if(!this.showGizmos)return;
      const g=flexalonGizmos(),ui=this.node.getComponent(UITransform);
      if(!g||!ui)return;
      g.beginColor(this.node,marginColor);
      rect(g,this.node,-ui.anchorX*ui.width,-ui.anchorY*ui.height,ui.width,ui.height);
    }
    @property({tooltip: "Cho phép nhận node được thả vào vùng drop.", visible: true}) public acceptDrop=true;
    public CanAccept(_node:Node):boolean{return this.acceptDrop;}
    public onDrop(node:Node):void {if(this.CanAccept(node))node.setParent(this.node,true);}
}
