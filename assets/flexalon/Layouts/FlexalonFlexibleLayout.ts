import { FlexalonObject } from '../Core/FlexalonObject';
import { _decorator, Enum, Vec3, UITransform } from 'cc';
import { LayoutBase, Item } from '../Core/FlexalonLayoutBase';
import { Align, Direction, GapOptions, SizeType, axisIndex, axisSign, axisValue, setAxis, align01 } from '../Core/FlexalonTypes';
const {ccclass, property, menu, executeInEditMode,requireComponent}=_decorator;
/** Linear / multi-line 2D flex with fill-weight distribution. Z direction works without wrapping. */
@ccclass('Flexalon.FlexalonFlexibleLayout')
@menu('Flexalon/Flexible Layout')
@executeInEditMode
@requireComponent(FlexalonObject)
export class FlexalonFlexibleLayout extends LayoutBase {
    @property({type:Enum(Direction), tooltip: "Hướng sắp xếp phần tử theo trục chính.", visible: true}) public direction: Direction = Direction.PositiveX;
    @property({type:Enum(Direction), tooltip: "Hướng tạo dòng/cột tiếp theo khi Wrap bật; nên vuông góc với Direction.", visible: function(this: FlexalonFlexibleLayout): boolean { return this.wrap; }}) public wrapDirection: Direction = Direction.NegativeY;
    @property({tooltip: "Cho phép child xuống dòng/cột khi vượt quá vùng chứa.", visible: true}) public wrap = false;
    @property({tooltip: "Khoảng cách cơ bản giữa các phần tử trên trục chính.", visible: true}) public gap = 10;
    /** 0 = no count limit. When positive, the next child starts a new line after this many items. */
    @property({tooltip: "Giới hạn số child trên một dòng/cột khi bật Wrap. 0 = không giới hạn; 3 = cứ đủ 3 phần tử sẽ xuống dòng, kể cả khi container còn chỗ. Vẫn xuống dòng sớm nếu thiếu diện tích.", min: 0, step: 1, visible: function(this: FlexalonFlexibleLayout): boolean { return this.wrap; }, displayName: "Max Items Per Line"}) public maxItemsPerLine = 0;
    @property({tooltip: "Khoảng cách giữa các dòng/cột sau khi xuống dòng (Wrap bật).", visible: function(this: FlexalonFlexibleLayout): boolean { return this.wrap; }}) public wrapGap = 10;
    @property({type:Enum(GapOptions), tooltip: "Fixed = gap cố định; SpaceBetween/Around/Evenly phân phối khoảng trống còn lại.", visible: true}) public gapOptions: GapOptions = GapOptions.Fixed;
    @property({type:Enum(Align), tooltip: "Canh nhóm child theo trục chính khi còn khoảng trống.", visible: true}) public mainAlign: Align = Align.Center;
    @property({type:Enum(Align), tooltip: "Canh từng child trong dòng/cột theo trục phụ.", visible: true}) public crossAlign: Align = Align.Center;
    @property({type:Enum(Align), tooltip: "Canh toàn bộ các dòng/cột trong vùng chứa (chỉ khi Wrap bật).", visible: function(this: FlexalonFlexibleLayout): boolean { return this.wrap; }}) public wrapAlign: Align = Align.Center;

    private formLines(items: Item[], main: number, maxMain: number, canWrap: boolean): Item[][] {
        if (items.length === 0) return [];
        if (!canWrap) return [items];
        const countLimit = Number.isFinite(this.maxItemsPerLine) && this.maxItemsPerLine > 0
            ? Math.max(1, Math.floor(this.maxItemsPerLine)) : Infinity;
        const lines: Item[][] = [];
        let current: Item[] = [];
        let used = 0;
        for (const item of items) {
            const width = axisValue(item.outer, main);
            // Two independent break conditions: child count AND remaining width.
            if (current.length > 0 && (current.length >= countLimit || used + this.gap + width > maxMain + 0.0001)) {
                lines.push(current);
                current = [];
                used = 0;
            }
            used += width + (current.length > 0 ? this.gap : 0);
            current.push(item);
        }
        if (current.length > 0) lines.push(current);
        return lines;
    }
    public measureIntrinsic(available: Vec3): Vec3 {
        const main = axisIndex(this.direction);
        const wrapAxis = axisIndex(this.wrapDirection);
        const canWrap = this.wrap && main !== wrapAxis;
        const cross = canWrap ? wrapAxis : (main === 0 ? 1 : 0);
        const depth = [0, 1, 2].find(a => a !== main && a !== cross)!;
        const items = this.items(this.contentSize(available), true);
        // The axis controlled by Layout must be allowed to grow to content.
        // For a fixed/component axis, calculate the needed cross-axis size using
        // the real width, not the parent's offered width for nested layouts.
        const obj = this.node.getComponent(FlexalonObject);
        let limit = Infinity;
        if (canWrap && obj?.typeForAxis(main) !== SizeType.Layout) {
            let width = axisValue(available, main);
            if (obj?.typeForAxis(main) === SizeType.Fixed) width = obj.clampSize(main, obj.fixed(main));
            else if (obj?.typeForAxis(main) === SizeType.Component) {
                const ui = this.node.getComponent(UITransform);
                if (ui && main < 2) width = main === 0 ? ui.width : ui.height;
            }
            const pad = main === 0 ? this.paddingLeft + this.paddingRight : main === 1 ? this.paddingTop + this.paddingBottom : this.paddingBack + this.paddingFront;
            limit = Math.max(0, width - pad);
        }
        const lines = this.formLines(items, main, limit, canWrap);
        const totalMain = lines.reduce((best, line) => Math.max(best, line.reduce((sum, i) => sum + axisValue(i.outer, main), 0) + (line.length - 1) * this.gap), 0);
        const totalCross = lines.reduce((sum, line) => sum + line.reduce((max, i) => Math.max(max, axisValue(i.outer, cross)), 0), 0) + Math.max(0, lines.length - 1) * (canWrap ? this.wrapGap : 0);
        const totalDepth = items.reduce((max, i) => Math.max(max, axisValue(i.outer, depth)), 0);
        const result = new Vec3();
        setAxis(result, main, totalMain);
        setAxis(result, cross, totalCross);
        setAxis(result, depth, totalDepth);
        result.x += this.paddingLeft + this.paddingRight;
        result.y += this.paddingTop + this.paddingBottom;
        result.z += this.paddingBack + this.paddingFront;
        return result;
    }
    public arrangeChildren(size: Vec3): void {
        const content=this.contentSize(size);
        const main=axisIndex(this.direction), mainSign=axisSign(this.direction);
        // Wrapping only works across perpendicular axes; never on same axis.
        const wrapAxis=axisIndex(this.wrapDirection);
        const cross=this.wrap && wrapAxis!==main ? wrapAxis : (main===0 ? 1 : 0);
        const crossSign=this.wrap && wrapAxis!==main ? axisSign(this.wrapDirection) : 1;
        const depth=[0,1,2].find(a=>a!==main && a!==cross)!;
        const items=this.items(content);
        // Main-axis fill children consume only their minimum size during line formation.
        for(const i of items){
            if(i.object?.typeForAxis(main)===SizeType.Fill){
                const next=i.size.clone();setAxis(next,main,i.object.clampSize(main,0));this.setItemSize(i,next);
            }
        }
        if(!items.length)return;
        const lines = this.formLines(items, main, axisValue(content, main), this.wrap && cross !== main);
        const lineCross=lines.map(g=>g.reduce((v,i)=>Math.max(v,axisValue(i.outer,cross)),0));
        const overallCross=lineCross.reduce((a,b)=>a+b,0)+Math.max(0,lines.length-1)*this.wrapGap;
        // Start on negative side of the content box, then apply alignment.
        let crossCursor=-axisValue(content,cross)/2+(axisValue(content,cross)-overallCross)*align01(this.wrapAlign);
        let itemIndex=0;
        lines.forEach((group,row)=>{
            const available=axisValue(content,main);
            const fixedGap=this.gap*Math.max(0,group.length-1);
            const fixed=group.reduce((s,i)=>s+(i.object?.typeForAxis(main)===SizeType.Fill?0:axisValue(i.outer,main)),0);
            const totalWeight=group.reduce((s,i)=>s+(i.object?.typeForAxis(main)===SizeType.Fill ? i.object.fraction(main):0),0);
            const spaceForFill=Math.max(0,available-fixed-fixedGap);
            if(totalWeight>0) for(const i of group){if(i.object?.typeForAxis(main)===SizeType.Fill){const newSize=i.size.clone();setAxis(newSize,main,Math.max(0,spaceForFill*i.object.fraction(main)/totalWeight - (axisValue(i.outer,main)-axisValue(i.size,main))));this.setItemSize(i,newSize);}}
            const occupied=group.reduce((s,i)=>s+axisValue(i.outer,main),0);
            const remainder=Math.max(0,available-occupied);
            let gap=this.gap, leading=0;
            if(this.gapOptions===GapOptions.SpaceBetween && group.length>1){gap=remainder/(group.length-1);}
            else if(this.gapOptions===GapOptions.SpaceAround){gap=remainder/group.length;leading=gap/2;}
            else if(this.gapOptions===GapOptions.SpaceEvenly){gap=remainder/(group.length+1);leading=gap;}
            else leading=(available-(occupied+gap*Math.max(0,group.length-1)))*align01(this.mainAlign);
            let cursor=-available/2+leading;
            group.forEach(i=>{
                const mainOuter=axisValue(i.outer,main), crossOuter=axisValue(i.outer,cross);
                const pos=new Vec3();
                setAxis(pos,main,mainSign*(cursor+mainOuter/2));
                setAxis(pos,cross,crossSign*(crossCursor + (lineCross[row]-crossOuter)*align01(this.crossAlign)+crossOuter/2));
                setAxis(pos,depth,this.aligned(axisValue(content,depth),axisValue(i.outer,depth),Align.Center));
                this.place(i,pos,size,itemIndex++);
                cursor+=mainOuter+gap;
            });
            crossCursor+=lineCross[row]+this.wrapGap;
        });
    }
}
