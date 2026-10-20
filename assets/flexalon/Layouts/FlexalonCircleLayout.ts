import { FlexalonObject } from '../Core/FlexalonObject';
import { _decorator, CCObject, UITransform, Vec3, Enum } from 'cc';
import { LayoutBase } from '../Core/FlexalonLayoutBase';
import { CircleRadiusType, CircleSpacingType, Plane } from '../Core/FlexalonTypes';
import { flexalonGizmos, pathColor } from '../Core/FlexalonGizmos';
const { ccclass, property, menu, executeInEditMode, requireComponent } = _decorator;

/**
 * Places children on a circle, ellipse, radial step spiral or concentric rings.
 * CircleRadiusType.Step/Wrap follow the radius increments from Flexalon Unity.
 * Retains the Cocos port's X/Y radii and Evenly + arcAngle behavior by default.
 */
@ccclass('Flexalon.FlexalonCircleLayout')
@menu('Flexalon/Circle Layout')
@executeInEditMode
@requireComponent(FlexalonObject)
export class FlexalonCircleLayout extends LayoutBase {
    @property({type: Enum(Plane), tooltip: 'Mặt phẳng bố trí vòng tròn (XY/XZ/ZY).', visible: true})
    public plane: Plane = Plane.XY;

    @property({tooltip: 'Bán kính ban đầu theo trục thứ nhất của mặt phẳng. Radius Step được cộng vào bán kính này.', visible: true})
    public radiusX = 100;

    @property({tooltip: 'Bán kính ban đầu theo trục thứ hai của mặt phẳng. Radius Step được cộng vào bán kính này.', visible: true})
    public radiusY = 100;

    @property({type: Enum(CircleRadiusType), tooltip: 'Constant: giữ nguyên bán kính. Step: cộng Radius Step mỗi child. Wrap: cộng Radius Step mỗi vòng 360 độ (như Flexalon Unity).', visible: true})
    public radiusType: CircleRadiusType = CircleRadiusType.Constant;

    @property({tooltip: 'Lượng thay đổi bán kính sau mỗi child (Step), hoặc mỗi vòng 360 độ (Wrap). Âm để thu dần. Đơn vị Cocos.', visible: function(this: FlexalonCircleLayout): boolean { return this.radiusType !== CircleRadiusType.Constant; }})
    public radiusStep = 20;

    @property({type: Enum(CircleSpacingType), tooltip: 'Evenly: chia child trên Arc Angle như bản Cocos cũ. Fixed: dùng Spacing Degrees, cho phép đi qua nhiều vòng như Flexalon Unity.', visible: true})
    public spacingType: CircleSpacingType = CircleSpacingType.Evenly;

    @property({tooltip: 'Góc cách nhau giữa hai child liên tiếp khi Spacing Type = Fixed (độ).', visible: function(this: FlexalonCircleLayout): boolean { return this.spacingType === CircleSpacingType.Fixed; }})
    public spacingDegrees = 30;

    @property({tooltip: 'Góc bắt đầu đặt child thứ nhất (độ). Trong chế độ Wrap, vòng được tính bằng floor((Start Angle + offset) / 360) như Unity.', visible: true})
    public startAngle = -90;

    @property({tooltip: 'Góc cung phân bố các child khi Spacing Type = Evenly; 360 = vòng khép kín, >360 để tạo nhiều vòng.', visible: function(this: FlexalonCircleLayout): boolean { return this.spacingType === CircleSpacingType.Evenly; }})
    public arcAngle = 360;

    @property({tooltip: 'Xoay child theo tiếp tuyến khi Plane = XY. Không áp dụng cho XZ/ZY trong bản port này.', visible: true})
    public rotateToTangent = false;

    public override onDrawGizmosSelected():void {
      super.onDrawGizmosSelected();
      if(!this.showGizmos || this.plane!==Plane.XY)return;
      const g=flexalonGizmos();if(!g)return;
      const ui=this.node.getComponent(UITransform);
      const origin=this.contentCenter(ui?new Vec3(ui.width,ui.height,1):new Vec3());
      const n=this.node.children.filter(c=>(c.hideFlags & CCObject.Flags.DontSave)===0 &&
        (this.includeInactive||c.active) && !c.getComponent(FlexalonObject)?.skipLayout).length;
      const start=this.childAngle(0,Math.max(1,n));
      const end=n<=1?start+360:this.childAngle(n-1,n);
      const last=Math.max(1,n-1),segments=Math.max(48,last*8);
      const pts:{x:number;y:number}[]=[];
      for(let i=0;i<=segments;i++){
        const t=i/segments,angle=start+(end-start)*t,radians=angle*Math.PI/180;
        const delta=this.radiusType===CircleRadiusType.Step?last*t*this.radiusStep:
          this.radiusType===CircleRadiusType.Wrap?Math.floor(angle/360)*this.radiusStep:0;
        pts.push({x:origin.x+Math.cos(radians)*(this.radiusX+delta),y:origin.y+Math.sin(radians)*(this.radiusY+delta)});
      }
      g.beginLocalPosition(this.node);g.beginColor(this.node,pathColor);g.drawLineList(this.node,pts);
      for(let k=0;k<n;k++){
        const angle=this.childAngle(k,n),d=this.childRadiusStep(k,angle),r=angle*Math.PI/180;
        g.drawCircle(this.node,{x:origin.x+Math.cos(r)*(this.radiusX+d),y:origin.y+Math.sin(r)*(this.radiusY+d)},4);
      }
      g.endLocalPosition(this.node);
    }

    /** Absolute angle including start angle (matches Unity's Wrap revolution index). */
    private childAngle(index: number, count: number): number {
        if (this.spacingType === CircleSpacingType.Fixed) {
            return this.startAngle + index * this.spacingDegrees;
        }
        const t = count <= 1 ? 0 :
            (Math.abs(this.arcAngle) >= 359.999 ? index / count : index / (count - 1));
        return this.startAngle + this.arcAngle * t;
    }

    /** Unity Step increments each item; Wrap increments at completed absolute 360° turns. */
    private childRadiusStep(index: number, angleDegrees: number): number {
        if (this.radiusType === CircleRadiusType.Step) return index * this.radiusStep;
        if (this.radiusType === CircleRadiusType.Wrap) {
            return Math.floor(angleDegrees / 360) * this.radiusStep;
        }
        return 0;
    }

    public measureIntrinsic(available: Vec3): Vec3 {
        const items = this.items(this.contentSize(available), true);
        const outer = items.reduce((s, i) => new Vec3(
            Math.max(s.x, i.outer.x), Math.max(s.y, i.outer.y), Math.max(s.z, i.outer.z)
        ), new Vec3());

        // Include the furthest child on every axis, not just the starting radii.
        // Negative Radius Step may cross zero and grow again in the other direction.
        let maxRadiusX = Math.abs(this.radiusX), maxRadiusY = Math.abs(this.radiusY);
        for (let k = 0; k < items.length; k++) {
            const increment = this.childRadiusStep(k, this.childAngle(k, items.length));
            maxRadiusX = Math.max(maxRadiusX, Math.abs(this.radiusX + increment));
            maxRadiusY = Math.max(maxRadiusY, Math.abs(this.radiusY + increment));
        }

        const size = this.plane === Plane.XY
            ? new Vec3(maxRadiusX * 2 + outer.x, maxRadiusY * 2 + outer.y, Math.max(1, outer.z))
            : this.plane === Plane.XZ
                ? new Vec3(maxRadiusX * 2 + outer.x, Math.max(1, outer.y), maxRadiusY * 2 + outer.z)
                : new Vec3(Math.max(1, outer.x), maxRadiusX * 2 + outer.y, maxRadiusY * 2 + outer.z);
        size.x += this.paddingLeft + this.paddingRight;
        size.y += this.paddingTop + this.paddingBottom;
        size.z += this.paddingFront + this.paddingBack;
        return size;
    }

    public arrangeChildren(size: Vec3): void {
        const items = this.items(this.contentSize(size));
        const n = items.length;
        items.forEach((item, k) => {
            const angle = this.childAngle(k, n);
            const phi = angle * Math.PI / 180;
            const increment = this.childRadiusStep(k, angle);
            const x = Math.cos(phi) * (this.radiusX + increment);
            const y = Math.sin(phi) * (this.radiusY + increment);
            const pos = new Vec3();
            if (this.plane === Plane.XY) { pos.x = x; pos.y = y; }
            else if (this.plane === Plane.XZ) { pos.x = x; pos.z = y; }
            else { pos.y = x; pos.z = y; }
            this.place(item, pos, size, k,
                this.rotateToTangent && this.plane === Plane.XY
                    ? new Vec3(0, 0, angle + 90) : null);
        });
    }
}
