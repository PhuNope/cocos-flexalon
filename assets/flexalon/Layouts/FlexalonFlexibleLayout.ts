import { FlexalonObject } from '../Core/FlexalonObject';
import { _decorator, Enum, Vec3, UITransform } from 'cc';
import { LayoutBase, Item, FitResult, calculateFitScale } from '../Core/FlexalonLayoutBase';
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
    private measureWithoutFit(available: Vec3): Vec3 {
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

    /**
     * A Layout axis has NO intrinsic available space. Never feed a previous
     * UITransform size back into its children's fit calculation.
     * A configured owner Max Size is an external cap, however.
     */
    private fitConstraints(available: Vec3): Vec3 {
        const owner=this.node.getComponent(FlexalonObject);
        const ui=this.node.getComponent(UITransform);
        const limits=this.contentSize(available);
        for(let axis=0;axis<3;axis++){
            const kind=owner?.typeForAxis(axis)??SizeType.Component;
            const pad=axis===0?this.paddingLeft+this.paddingRight:
                axis===1?this.paddingTop+this.paddingBottom:this.paddingFront+this.paddingBack;
            let bound=axisValue(limits,axis);
            if(kind===SizeType.Layout){
                const max=axis===0?owner!.maxSize.x:axis===1?owner!.maxSize.y:owner!.maxSize.z;
                bound=max>0?Math.max(0,max-pad):Infinity;
            }else if(kind===SizeType.Fixed){
                bound=Math.max(0,owner!.clampSize(axis,owner!.fixed(axis))-pad);
            }else if(kind===SizeType.Component && ui && axis<2){
                bound=Math.max(0,(axis===0?ui.width:ui.height)-pad);
            }
            setAxis(limits,axis,bound);
        }
        return limits;
    }

    /** Compute a stable item measurement without changing UITransform or node scale. */
    private intrinsicFitItem(item: Item, bounds: Vec3, content: Vec3): FitResult {
        const natural=this.fitNaturalSize(item,content);
        const original=this.baseScale(item.node),mult=item.object?.scaleMultiplier;
        const scale=new Vec3(original.x*(mult?.x??1),original.y*(mult?.y??1),original.z*(mult?.z??1));
        const pad=Math.max(0,this.fitPadding);
        const factor=calculateFitScale(natural,scale,
            Math.max(0,bounds.x-item.marginLeft-item.marginRight-2*pad),
            Math.max(0,bounds.y-item.marginTop-item.marginBottom-2*pad),
            item.object?.minSize??new Vec3(),item.object?.maxSize??new Vec3());
        const visual=new Vec3(natural.x*Math.abs(scale.x)*factor,
            natural.y*Math.abs(scale.y)*factor,natural.z*Math.abs(scale.z)*factor);
        item.size.set(natural);
        item.outer.set(visual.x+item.marginLeft+item.marginRight+2*pad,
            visual.y+item.marginTop+item.marginBottom+2*pad,
            visual.z+item.marginFront+item.marginBack);
        return {scale:factor,visualSize:visual};
    }

    /**
     * Shared line allocation for BOTH measurement and placement.
     * - Unbounded Layout axes: use natural visual size; only explicit limits
     *   (Fit Item Size, item Max Size, the other Fixed axis) can change scale.
     * - Bounded axes: subtract regular items and gaps, then distribute only
     *   remaining space between Fill and Scale To Fit using Fill weights.
     */
    private allocateFitLines(items: Item[], available: Vec3, measuring: boolean):
        {lines:Item[][]; fitted:Map<Item,FitResult>; main:number;cross:number;depth:number;content:Vec3} {
        const main=axisIndex(this.direction);
        const wrapAxis=axisIndex(this.wrapDirection),canWrap=this.wrap&&wrapAxis!==main;
        const cross=canWrap?wrapAxis:(main===0?1:0);
        const depth=[0,1,2].find(axis=>axis!==main&&axis!==cross)!;
        const content=this.fitConstraints(available);
        const fitPad=Math.max(0,this.fitPadding);
        const axisMargin=(item:Item,axis:number)=>axis===0?item.marginLeft+item.marginRight:
            axis===1?item.marginTop+item.marginBottom:item.marginFront+item.marginBack;
        // Line breaks are based on minimum occupied size, never the big source
        // size of an item whose Scale To Fit can shrink.
        for(const item of items){
            if(this.shouldFit(item)){
                const min=item.object?.minSize;
                const visibleMin=main===0?(min?.x??0):main===1?(min?.y??0):(min?.z??0);
                setAxis(item.outer,main,Math.max(0,visibleMin)+axisMargin(item,main)+2*fitPad);
            }else if(item.object?.typeForAxis(main)===SizeType.Fill){
                const newSize=item.size.clone();
                setAxis(newSize,main,item.object.clampSize(main,0));
                this.setItemSize(item,newSize);
            }
        }
        const lines=this.formLines(items,main,axisValue(content,main),canWrap);
        const crossExtent=axisValue(content,cross);
        const crossSlot=canWrap&&Number.isFinite(crossExtent)
            ?Math.max(0,(crossExtent-Math.max(0,lines.length-1)*this.wrapGap)/Math.max(1,lines.length))
            :crossExtent;
        const fitted=new Map<Item,FitResult>();
        for(const line of lines){
            const fixedGap=this.gap*Math.max(0,line.length-1);
            const fixed=line.reduce((sum,item)=>{
                if(this.shouldFit(item))return sum+axisMargin(item,main)+2*fitPad;
                return sum+axisValue(item.outer,main);
            },0);
            const growing=line.filter(item=>this.shouldFit(item) ||
                item.object?.typeForAxis(main)===SizeType.Fill);
            const weight=(item:Item):number=>{
                const fraction=item.object?.fraction(main);
                return Number.isFinite(fraction)&&fraction!>=0?fraction!:1;
            };
            let totalWeight=growing.reduce((sum,item)=>sum+weight(item),0);
            if(totalWeight<=0)totalWeight=growing.length;
            const availableMain=axisValue(content,main);
            const remaining=Number.isFinite(availableMain)?Math.max(0,availableMain-fixed-fixedGap):Infinity;
            for(const item of line){
                if(this.shouldFit(item)){
                    const w=totalWeight>0?(weight(item)>0?weight(item):0)/totalWeight:0;
                    const allotment=Number.isFinite(remaining)
                        ?remaining*(totalWeight>0?w:1/Math.max(1,growing.length)):Infinity;
                    const bounds=content.clone();
                    setAxis(bounds,main,Number.isFinite(allotment)
                        ?allotment+axisMargin(item,main)+2*fitPad:Infinity);
                    setAxis(bounds,cross,crossSlot);
                    const limited=this.fitBounds(bounds);
                    const fit=measuring?this.intrinsicFitItem(item,limited,content)
                        :this.fitItem(item,limited,content);
                    fitted.set(item,fit);
                }else if(item.object?.typeForAxis(main)===SizeType.Fill &&
                    Number.isFinite(remaining)&&!measuring){
                    const w=totalWeight>0?weight(item)/totalWeight:0;
                    const next=item.size.clone();
                    setAxis(next,main,Math.max(0,remaining*w));
                    this.setItemSize(item,next);
                }
            }
        }
        return {lines,fitted,main,cross,depth,content};
    }

    public measureIntrinsic(available: Vec3): Vec3 {
        // Keep all previous sizing semantics for layouts without fitted items.
        const measuringItems=this.items(this.contentSize(available),true);
        if(!measuringItems.some(item=>this.shouldFit(item)))return this.measureWithoutFit(available);
        const {lines,main,cross,depth}=this.allocateFitLines(measuringItems,available,true);
        const totalMain=lines.reduce((max,line)=>Math.max(max,
            line.reduce((sum,item)=>sum+axisValue(item.outer,main),0)+
            Math.max(0,line.length-1)*this.gap),0);
        const totalCross=lines.reduce((sum,line)=>sum+line.reduce(
            (max,item)=>Math.max(max,axisValue(item.outer,cross)),0),0)+
            Math.max(0,lines.length-1)*(this.wrap&&axisIndex(this.wrapDirection)!==main?this.wrapGap:0);
        const totalDepth=measuringItems.reduce((max,item)=>Math.max(max,axisValue(item.outer,depth)),0);
        const result=new Vec3();
        setAxis(result,main,totalMain);
        setAxis(result,cross,totalCross);
        setAxis(result,depth,totalDepth);
        result.x+=this.paddingLeft+this.paddingRight;
        result.y+=this.paddingTop+this.paddingBottom;
        result.z+=this.paddingFront+this.paddingBack;
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
        if(items.some(item=>this.shouldFit(item))){
            this.arrangeWithFit(items,size);
            return;
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
            const fixed=group.reduce((s,i)=>s+(!fitted.has(i)&&i.object?.typeForAxis(main)===SizeType.Fill?0:axisValue(i.outer,main)),0);
            const totalWeight=group.reduce((s,i)=>s+(!fitted.has(i)&&i.object?.typeForAxis(main)===SizeType.Fill ? i.object.fraction(main):0),0);
            const spaceForFill=Math.max(0,available-fixed-fixedGap);
            if(totalWeight>0) for(const i of group){if(!fitted.has(i)&&i.object?.typeForAxis(main)===SizeType.Fill){const newSize=i.size.clone();setAxis(newSize,main,Math.max(0,spaceForFill*i.object.fraction(main)/totalWeight - (axisValue(i.outer,main)-axisValue(i.size,main))));this.setItemSize(i,newSize);}}
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
                this.place(i,pos,size,itemIndex++,null,fitted.get(i));
                cursor+=mainOuter+gap;
            });
            crossCursor+=lineCross[row]+this.wrapGap;
        });
    }

    private arrangeWithFit(items:Item[],size:Vec3):void{
        const {lines,fitted,main,cross,depth,content}=this.allocateFitLines(items,size,false);
        const mainSign=axisSign(this.direction);
        const wrapAxis=axisIndex(this.wrapDirection);
        const crossSign=this.wrap&&wrapAxis!==main?axisSign(this.wrapDirection):1;
        const lineCross=lines.map(line=>line.reduce((v,item)=>Math.max(v,axisValue(item.outer,cross)),0));
        const overallCross=lineCross.reduce((sum,v)=>sum+v,0)+Math.max(0,lines.length-1)*this.wrapGap;
        const availableCross=axisValue(this.contentSize(size),cross);
        let crossCursor=-availableCross/2+
            (availableCross-overallCross)*align01(this.wrapAlign);
        let itemIndex=0;
        lines.forEach((line,row)=>{
            const availableMain=axisValue(this.contentSize(size),main);
            const occupied=line.reduce((sum,item)=>sum+axisValue(item.outer,main),0);
            const remainder=Math.max(0,availableMain-occupied);
            let gap=this.gap,leading=0;
            if(this.gapOptions===GapOptions.SpaceBetween&&line.length>1){
                gap=remainder/(line.length-1);
            }else if(this.gapOptions===GapOptions.SpaceAround){
                gap=remainder/line.length;leading=gap/2;
            }else if(this.gapOptions===GapOptions.SpaceEvenly){
                gap=remainder/(line.length+1);leading=gap;
            }else {
                leading=(availableMain-(occupied+gap*Math.max(0,line.length-1)))*align01(this.mainAlign);
            }
            let cursor=-availableMain/2+leading;
            line.forEach(item=>{
                const mainOuter=axisValue(item.outer,main),crossOuter=axisValue(item.outer,cross);
                const pos=new Vec3();
                setAxis(pos,main,mainSign*(cursor+mainOuter/2));
                setAxis(pos,cross,crossSign*(crossCursor+
                    (lineCross[row]-crossOuter)*align01(this.crossAlign)+crossOuter/2));
                setAxis(pos,depth,this.aligned(axisValue(this.contentSize(size),depth),
                    axisValue(item.outer,depth),Align.Center));
                this.place(item,pos,size,itemIndex++,null,fitted.get(item));
                cursor+=mainOuter+gap;
            });
            crossCursor+=lineCross[row]+this.wrapGap;
        });
    }
}
