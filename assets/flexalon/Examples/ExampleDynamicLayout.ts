import { _decorator, Component, Node, UITransform, Graphics, Color } from 'cc';
import { FlexalonFlexibleLayout } from '../Layouts/FlexalonFlexibleLayout';
import { Direction, GapOptions } from '../Core/FlexalonTypes';
const {ccclass,menu}=_decorator;
/** Attach to a UI node with UITransform, hit Play. Creates children with no sprite asset required. */
@ccclass('Flexalon.ExampleDynamicLayout')
@menu('Flexalon/Example Dynamic Layout')
export class ExampleDynamicLayout extends Component {
    protected start():void {
        const ui=this.node.getComponent(UITransform)??this.node.addComponent(UITransform);
        ui.setContentSize(650,320);
        const layout=this.node.getComponent(FlexalonFlexibleLayout)??this.node.addComponent(FlexalonFlexibleLayout);
        layout.direction=Direction.PositiveX;layout.wrap=true;layout.gap=12;layout.wrapGap=12;layout.paddingLeft=16;layout.paddingTop=16;layout.paddingRight=16;layout.paddingBottom=16;layout.gapOptions=GapOptions.Fixed;
        for(let i=0;i<10;i++) {
            const child=new Node(`Flex Item ${i+1}`);child.parent=this.node;
            const w=70+i%3*18,h=50+i%2*20;
            child.addComponent(UITransform).setContentSize(w,h);
            const g=child.addComponent(Graphics);
            g.fillColor=new Color(55+i*17, 100+i*10, 175-i*8, 255);
            g.rect(-w/2,-h/2,w,h);g.fill();
        }
        layout.ForceUpdate();
    }
}
