import { _decorator, Component, Node } from 'cc';
const {ccclass,property,menu}=_decorator;
/** Drop zone placeholder: use CanAccept and onDrop to integrate into game-specific drag/drop logic. */
@ccclass('Flexalon.FlexalonDragTarget')
@menu('Flexalon/Drag Target')
export class FlexalonDragTarget extends Component {
    @property({tooltip: "Cho phép nhận node được thả vào vùng drop.", visible: true}) public acceptDrop=true;
    public CanAccept(_node:Node):boolean{return this.acceptDrop;}
    public onDrop(node:Node):void {if(this.CanAccept(node))node.setParent(this.node);}
}
