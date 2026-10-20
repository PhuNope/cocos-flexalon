import { FlexalonObject } from '../Core/FlexalonObject';
import { _decorator, Enum, UITransform, Vec3 } from 'cc';
import { LayoutBase } from '../Core/FlexalonLayoutBase';
import { ShapeType } from '../Core/FlexalonTypes';
import { flexalonGizmos, drawLocalLineList, pathColor } from '../Core/FlexalonGizmos';
const {ccclass,property,menu,executeInEditMode,requireComponent}=_decorator;
/** Rectangle perimeter, ellipse perimeter, or regular-polygon boundary. */
@ccclass('Flexalon.FlexalonShapeLayout')
@menu('Flexalon/Shape Layout')
@executeInEditMode
@requireComponent(FlexalonObject)
export class FlexalonShapeLayout extends LayoutBase {
    @property({type:Enum(ShapeType), tooltip: "Loại đường bao đặt tâm của các child: Rectangle, Ellipse hoặc Polygon.", visible: true}) public shape:ShapeType=ShapeType.Rectangle;
    @property({tooltip: "Chiều rộng của đường bao được sử dụng để phân bố tâm child.", visible: true}) public width=300;
    @property({tooltip: "Chiều cao của đường bao được sử dụng để phân bố tâm child.", visible: true}) public height=200;
    @property({tooltip: "Số cạnh của Polygon (tối thiểu 3); chỉ hiện khi chọn Polygon.", visible: function(this: FlexalonShapeLayout): boolean { return this.shape === ShapeType.Polygon; }}) public sides=6;
    @property({tooltip: "Góc bắt đầu của Ellipse hoặc Polygon (độ); Rectangle không dùng.", visible: function(this: FlexalonShapeLayout): boolean { return this.shape !== ShapeType.Rectangle; }}) public startAngle=-90;
    public override onDrawGizmosSelected():void {
      super.onDrawGizmosSelected();if(!this.showGizmos)return;
      const g=flexalonGizmos();if(!g)return;
      const w=Math.max(0,this.width),h=Math.max(0,this.height),points:{x:number;y:number}[]=[];
      if(this.shape===ShapeType.Rectangle)
        points.push({x:-w/2,y:-h/2},{x:w/2,y:-h/2},{x:w/2,y:h/2},{x:-w/2,y:h/2});
      else {
        const steps=this.shape===ShapeType.Ellipse?64:Math.max(3,Math.floor(this.sides));
        for(let i=0;i<steps;i++){
          const a=(this.startAngle+360*i/steps)*Math.PI/180;
          points.push({x:Math.cos(a)*w/2,y:Math.sin(a)*h/2});
        }
      }
      const ui=this.node.getComponent(UITransform);
      const center=this.contentCenter(ui?new Vec3(ui.width,ui.height,1):new Vec3());
      g.beginColor(this.node,pathColor);
      drawLocalLineList(g,this.node,points.map(p=>({x:p.x+center.x,y:p.y+center.y})),true);
    }
    public measureIntrinsic(available:Vec3):Vec3 {
        // Shape dimensions describe the path of the CHILD CENTERS. Add child
        // bounds so Layout size contains the actual rendered rectangles.
        const items=this.items(this.contentSize(available),true);
        const outer=items.reduce((s,i)=>new Vec3(Math.max(s.x,i.outer.x),Math.max(s.y,i.outer.y),Math.max(s.z,i.outer.z)),new Vec3());
        return new Vec3(Math.max(0,this.width)+outer.x+this.paddingLeft+this.paddingRight,
            Math.max(0,this.height)+outer.y+this.paddingTop+this.paddingBottom,
            Math.max(1,outer.z)+this.paddingFront+this.paddingBack);
    }
    public arrangeChildren(size:Vec3):void{
        const items=this.items(this.contentSize(size)),n=items.length;
        items.forEach((i,k)=>{
            const t=k/n;let x=0,y=0;
            if(this.shape===ShapeType.Ellipse){const a=this.startAngle*Math.PI/180+t*Math.PI*2;x=this.width/2*Math.cos(a);y=this.height/2*Math.sin(a);}
            else if(this.shape===ShapeType.Polygon){const s=Math.max(3,Math.floor(this.sides)),a=t*s;
                const edge=Math.floor(a),r=a-edge;
                const a0=this.startAngle*Math.PI/180+(edge/s)*2*Math.PI;
                const a1=a0+2*Math.PI/s;
                x=(Math.cos(a0)*(1-r)+Math.cos(a1)*r)*this.width/2;
                y=(Math.sin(a0)*(1-r)+Math.sin(a1)*r)*this.height/2;
            } else {
                const w=Math.max(0,this.width),h=Math.max(0,this.height),d=2*(w+h),v=t*d;
                if(v<w){x=-w/2+v;y=-h/2;}
                else if(v<w+h){x=w/2;y=-h/2+v-w;}
                else if(v<2*w+h){x=w/2-(v-w-h);y=h/2;}
                else{x=-w/2;y=h/2-(v-2*w-h);}
            }
            this.place(i,new Vec3(x,y,0),size,k);
        });
    }
}
