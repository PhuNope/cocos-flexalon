import { FlexalonObject } from '../Core/FlexalonObject';
import { _decorator, UITransform, Vec3 } from 'cc';
import { LayoutBase } from '../Core/FlexalonLayoutBase';
import { FlexalonMath } from '../Core/FlexalonMath';
import { flexalonGizmos, drawLocalLineList, drawLocalCircle, pathColor, paddingColor } from '../Core/FlexalonGizmos';
const {ccclass,property,menu,executeInEditMode,requireComponent}=_decorator;
/** Single cubic Bézier segment. Position and optional XY tangent alignment. */
@ccclass('Flexalon.FlexalonCurveLayout')
@menu('Flexalon/Curve Layout')
@executeInEditMode
@requireComponent(FlexalonObject)
export class FlexalonCurveLayout extends LayoutBase {
    @property({type:Vec3, tooltip: "Điểm đầu P0 của đường cong Bézier bậc ba (local).", visible: true}) public point0=new Vec3(-150,0,0);
    @property({type:Vec3, tooltip: "Điểm điều khiển P1 của đường cong Bézier bậc ba.", visible: true}) public point1=new Vec3(-50,150,0);
    @property({type:Vec3, tooltip: "Điểm điều khiển P2 của đường cong Bézier bậc ba.", visible: true}) public point2=new Vec3(50,-150,0);
    @property({type:Vec3, tooltip: "Điểm cuối P3 của đường cong Bézier bậc ba.", visible: true}) public point3=new Vec3(150,0,0);
    @property({tooltip: "Xoay child theo tiếp tuyến đường cong trên mặt phẳng XY.", visible: true}) public orientAlongCurve=false;
    @property({tooltip: "Phân bố child đều theo độ dài cung (xấp xỉ); tắt để phân bố đều theo tham số t.", visible: true}) public uniformDistance=true;
    public override onDrawGizmosSelected():void {
      super.onDrawGizmosSelected();if(!this.showGizmos)return;
      const g=flexalonGizmos();if(!g)return;
      const ui=this.node.getComponent(UITransform);
      const center=this.contentCenter(ui?new Vec3(ui.width,ui.height,1):new Vec3());
      const shift=(p:Vec3)=>({x:p.x+center.x,y:p.y+center.y});
      g.beginColor(this.node,paddingColor);
      drawLocalLineList(g,this.node,[shift(this.point0),shift(this.point1)]);
      drawLocalLineList(g,this.node,[shift(this.point2),shift(this.point3)]);
      g.beginColor(this.node,pathColor);
      drawLocalLineList(g,this.node,Array.from({length:65},(_,i)=>shift(FlexalonMath.Bezier(this.point0,this.point1,this.point2,this.point3,i/64))));
      for(const p of [this.point0,this.point1,this.point2,this.point3])drawLocalCircle(g,this.node,shift(p),5);
    }
    public measureIntrinsic(available:Vec3):Vec3 {
        // Approximate the cubic's bounding rectangle with sampled points,
        // then expand by the largest child margins and measured dimensions.
        // This sizes the panel for the drawn curve; it does not re-center
        // user-authored control points that are offset from the origin.
        const items=this.items(this.contentSize(available),true);
        const outer=items.reduce((s,i)=>new Vec3(Math.max(s.x,i.outer.x),Math.max(s.y,i.outer.y),Math.max(s.z,i.outer.z)),new Vec3());
        let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
        for(let k=0;k<=100;k++) {
            const p=FlexalonMath.Bezier(this.point0,this.point1,this.point2,this.point3,k/100);
            minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);
            minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
            minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);
        }
        return new Vec3(maxX-minX+outer.x+this.paddingLeft+this.paddingRight,
            maxY-minY+outer.y+this.paddingTop+this.paddingBottom,
            Math.max(1,maxZ-minZ+outer.z)+this.paddingFront+this.paddingBack);
    }
    private arcValues():number[] {
        const acc=[0];let prev=this.point0;
        for(let i=1;i<=100;i++){const p=FlexalonMath.Bezier(this.point0,this.point1,this.point2,this.point3,i/100);acc.push(acc[i-1]+Vec3.distance(prev,p));prev=p;}
        return acc;
    }
    private progress(q:number,table:number[]):number{
        const target=q*table[100];let lo=0,hi=100;
        while(lo<hi){const m=(lo+hi)>>1;if(table[m]<target)lo=m+1;else hi=m;}
        if(lo===0)return 0;
        const span=table[lo]-table[lo-1];return ((lo-1)+(span>0?(target-table[lo-1])/span:0))/100;
    }
    public arrangeChildren(size:Vec3):void{
        const items=this.items(this.contentSize(size)),n=items.length;const table=this.uniformDistance?this.arcValues():[];
        items.forEach((i,k)=>{
            const fraction=n===1?.5:k/(n-1);
            const t=this.uniformDistance?this.progress(fraction,table):fraction;
            const pos=FlexalonMath.Bezier(this.point0,this.point1,this.point2,this.point3,t);
            const tangent=FlexalonMath.BezierTangent(this.point0,this.point1,this.point2,this.point3,t);
            this.place(i,pos,size,k,this.orientAlongCurve?new Vec3(0,0,Math.atan2(tangent.y,tangent.x)*180/Math.PI):null);
        });
    }
}
