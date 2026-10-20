import { _decorator, Enum, Vec3, UITransform } from 'cc';
import { FlexalonComponent } from './FlexalonComponent';
import { Directions, SizeType, axisValue, finitePositive } from './FlexalonTypes';
import { flexalonGizmos, rect, boundsColor, marginColor } from './FlexalonGizmos';
const { ccclass, property, executeInEditMode, menu, executionOrder } = _decorator;
/** Child overrides: explicit sizing, fill ratios, min/max, margins and transform offsets. */
@ccclass('Flexalon.FlexalonObject')
@executeInEditMode
@executionOrder(-100)
@menu('Flexalon/Flexalon Object')
export class FlexalonObject extends FlexalonComponent {
    @property({tooltip: 'Vẽ Content Bounds và Margin khi chọn Node (cần Cocos-Gizmos v2).', visible: true})
    public showGizmos = true;
    public onDrawGizmos(): void { /* selected only */ }
    public onDrawGizmosSelected(): void {
      if (!this.showGizmos || !this.node) return;
      const g=flexalonGizmos(),ui=this.node.getComponent(UITransform);
      if (!g || !ui) return;
      const x=-ui.anchorX*ui.width,y=-ui.anchorY*ui.height;
      g.beginLocalPosition(this.node);
      g.beginColor(this.node,boundsColor);
      rect(g,this.node,x,y,ui.width,ui.height);
      if(this.marginLeft||this.marginRight||this.marginTop||this.marginBottom) {
        g.beginColor(this.node,marginColor);
        rect(g,this.node,x-this.marginLeft,y-this.marginBottom,
          ui.width+this.marginLeft+this.marginRight,ui.height+this.marginTop+this.marginBottom);
      }
      g.endLocalPosition(this.node);
    }
    @property({type: Enum(SizeType), tooltip: "Chọn cách tính chiều rộng: Fixed = Size X; Fill = phần còn lại của layout cha; Component = UITransform; Layout = kích thước nội dung layout trên node này.", visible: true}) public widthType: SizeType = SizeType.Component;
    @property({type: Enum(SizeType), tooltip: "Chọn cách tính chiều cao: Fixed = Size Y; Fill = phần còn lại của layout cha; Component = UITransform; Layout = kích thước nội dung layout trên node này.", visible: true}) public heightType: SizeType = SizeType.Component;
    @property({type: Enum(SizeType), tooltip: "Chọn cách tính chiều sâu Z: Fixed = Size Z; Fill = layout cha; Component = kích thước nguồn; Layout = nội dung layout. UITransform chỉ có X/Y.", visible: true}) public depthType: SizeType = SizeType.Component;
    @property({type: Vec3, tooltip: "Kích thước X/Y/Z khi trục tương ứng dùng chế độ Fixed. X/Y có thể ghi vào UITransform khi Preserve UI Content Size tắt.", visible: function(this: FlexalonObject): boolean { return this.widthType === SizeType.Fixed || this.heightType === SizeType.Fixed || this.depthType === SizeType.Fixed; }}) public size: Vec3 = new Vec3(100, 100, 1);
    @property({type: Vec3, tooltip: "Trọng số hoặc tỉ lệ chiếm không gian cho các trục dùng Fill. Chỉ có ý nghĩa khi được layout cha phân bổ.", visible: function(this: FlexalonObject): boolean { return this.widthType === SizeType.Fill || this.heightType === SizeType.Fill || this.depthType === SizeType.Fill; }}) public fill: Vec3 = new Vec3(1, 1, 1);
    @property({type: Vec3, tooltip: "Giới hạn kích thước tối thiểu X/Y/Z; 0 = không đặt ngưỡng tối thiểu.", visible: true}) public minSize: Vec3 = new Vec3(0, 0, 0);
    /** Zero max means unbounded. */
    @property({type: Vec3, tooltip: "Giới hạn kích thước tối đa X/Y/Z; 0 = không giới hạn trên.", visible: true}) public maxSize: Vec3 = new Vec3(0, 0, 0);
    @property({tooltip: "Khoảng trống bên trái phần tử trong layout, đơn vị local.", visible: true}) public marginLeft = 0;
    @property({tooltip: "Khoảng trống bên phải phần tử trong layout, đơn vị local.", visible: true}) public marginRight = 0;
    @property({tooltip: "Khoảng trống phía trên phần tử trong layout, đơn vị local.", visible: true}) public marginTop = 0;
    @property({tooltip: "Khoảng trống phía dưới phần tử trong layout, đơn vị local.", visible: true}) public marginBottom = 0;
    @property({tooltip: "Khoảng trống phía trước phần tử theo trục Z.", visible: true}) public marginFront = 0;
    @property({tooltip: "Khoảng trống phía sau phần tử theo trục Z.", visible: true}) public marginBack = 0;
    @property({type: Vec3, tooltip: "Dịch chuyển vị trí cuối cùng so với vị trí do layout tính (local XYZ).", visible: true}) public offset: Vec3 = new Vec3();
    @property({type: Vec3, tooltip: "Cộng thêm góc Euler XYZ (độ) vào rotation do layout tính. Không giữ rotation cũ của child.", visible: true}) public rotationOffset: Vec3 = new Vec3();
    @property({type: Vec3, tooltip: "Nhân tỷ lệ scale XYZ của node sau khi layout sắp xếp.", visible: true}) public scaleMultiplier: Vec3 = new Vec3(1,1,1);
    @property({tooltip: "Bỏ qua node này khi layout cha đo kích thước và sắp xếp các child.", visible: true}) public skipLayout = false;
    @property({tooltip: "BẬT: không thay đổi UITransform.width/height. TẮT (khuyên dùng): Flexalon đồng bộ UITransform theo Fixed/Fill/Layout. Có thể gây chênh lệch giữa kích thước layout và kích thước hiển thị khi bật.", visible: true, displayName: "Preserve UI Content Size"}) public preserveUIContentSize = false;
    /**
     * Keep UITransform.contentSize in sync with Fixed X/Y, even when this node
     * has no Flexalon layout parent. Component, Fill, and Layout modes do NOT
     * overwrite the UITransform here: Component reads it, while Fill/Layout are
     * calculated by a layout. A node with its OWN LayoutBase applies its
     * Layout size to UITransform during LayoutBase.ForceUpdate (root or nested).
     * Z has no UITransform dimension.
     *
     * Also polled in edit mode: editing size.x on a serialized Vec3 does not
     * reliably invoke a TypeScript property setter in Cocos Inspector.
     */
    public SyncFixedUIContentSize(): void {
        if (this.preserveUIContentSize || !this.node) return;
        const ui = this.node.getComponent(UITransform);
        if (!ui) return;
        const width = this.widthType === SizeType.Fixed ? this.clampSize(0, this.fixed(0)) : ui.width;
        const height = this.heightType === SizeType.Fixed ? this.clampSize(1, this.fixed(1)) : ui.height;
        if (Math.abs(ui.width - width) > 0.0001 || Math.abs(ui.height - height) > 0.0001) {
            ui.setContentSize(width, height);
        }
    }
    protected onEnable(): void { this.SyncFixedUIContentSize(); }
    protected lateUpdate(): void { this.SyncFixedUIContentSize(); }
    /** Explicit API for game scripts/editor actions; regular edit/play mode also syncs automatically. */
    public override ForceUpdate(): void {
        super.ForceUpdate();
        this.SyncFixedUIContentSize();
    }
    /** Convenience setter: use Fixed for width/height and apply them immediately. */
    public SetFixedSize(width: number, height: number): void {
        this.widthType = SizeType.Fixed;
        this.heightType = SizeType.Fixed;
        this.size.set(width, height, this.size.z);
        this.ForceUpdate();
    }
    get Margin(): Directions { return new Directions(this.marginRight,this.marginLeft,this.marginTop,this.marginBottom,this.marginBack,this.marginFront); }
    public typeForAxis(axis: number): SizeType { return axis === 0 ? this.widthType : axis === 1 ? this.heightType : this.depthType; }
    public fixed(axis: number): number { return finitePositive(axisValue(this.size,axis)); }
    public fraction(axis: number): number { return finitePositive(axisValue(this.fill,axis)); }
    public clampSize(axis: number, size: number): number {
        const min = finitePositive(axisValue(this.minSize,axis));
        const max = axisValue(this.maxSize,axis);
        return Math.max(min, max > 0 ? Math.min(size,max) : size);
    }
}
