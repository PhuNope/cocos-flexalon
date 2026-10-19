import { FlexalonObject } from '../Core/FlexalonObject';
import { _decorator, Enum, Vec3 } from 'cc';
import { LayoutBase, Item } from '../Core/FlexalonLayoutBase';
import { Align, Axis, GridCorner, GridCellType, GridCellSizing, SizeType, align01 } from '../Core/FlexalonTypes';
import { FlexalonGridCell } from './FlexalonGridCell';

const { ccclass, property, menu, executeInEditMode, requireComponent } = _decorator;

type Slot = { item: Item; column: number; row: number; spanC: number; spanR: number };
type GridGeometry = { columns: number; rows: number; slots: Slot[]; widths: number[]; heights: number[]; gridWidth: number; gridHeight: number };

/**
 * Rectangle: cells can be equal sized or fit their individual columns/rows.
 * Hexagonal: cells intentionally remain uniform, since unequal hexagons are
 * not a regular tessellation. In that case FitChildren uses the largest child
 * as the minimum cell size instead of irregular per-column dimensions.
 */
@ccclass('Flexalon.FlexalonGridLayout')
@menu('Flexalon/Grid Layout')
@executeInEditMode
@requireComponent(FlexalonObject)
export class FlexalonGridLayout extends LayoutBase {
    @property({type: Enum(GridCellType), tooltip: 'Rectangle = ô chữ nhật; Hexagonal = tổ ong (các hàng lẻ lệch nửa ô, khoảng cách tâm hàng là 75% chiều cao ô + Row Gap). Chỉ thay đổi vị trí, không tạo sprite lục giác.', visible: true, displayName: 'Cell Type'}) public cellType: GridCellType = GridCellType.Rectangle;
    @property({type: Enum(GridCellSizing), tooltip: 'Uniform = ô đều, chia từ kích thước parent (tự tăng tối thiểu nếu có child quá lớn); FitChildren = từng cột rộng bằng child lớn nhất trong cột, từng hàng cao bằng child lớn nhất trong hàng. Hexagonal luôn giữ ô đều để đúng hình học.', visible: true, displayName: 'Cell Sizing'}) public cellSizing: GridCellSizing = GridCellSizing.Uniform;
    @property({tooltip: 'Số cột của lưới; <= 0 tự suy ra số cột từ số child.', visible: true}) public columns = 3;
    @property({tooltip: 'Số hàng của lưới; 0 tự tính theo số child và cột.', visible: true}) public rows = 0;
    @property({tooltip: 'Khoảng cách giữa các cột (local units).', visible: true}) public columnGap = 10;
    @property({tooltip: 'Khoảng cách giữa các hàng (local units).', visible: true}) public rowGap = 10;
    @property({type: Enum(GridCorner), tooltip: 'Góc bắt đầu điền các ô trong lưới.', visible: true}) public startCorner: GridCorner = GridCorner.TopLeft;
    @property({type: Enum(Axis), tooltip: 'Trục ưu tiên điền Grid: X = cột trước; Y = hàng trước.', visible: true}) public startAxis: Axis = Axis.x;
    @property({type: Enum(Align), tooltip: 'Căn ngang child bên trong cell, xét cả margin của FlexalonObject.', visible: true}) public horizontalAlign: Align = Align.Center;
    @property({type: Enum(Align), tooltip: 'Căn dọc child bên trong cell, xét cả margin của FlexalonObject.', visible: true}) public verticalAlign: Align = Align.Center;

    private colCount(n: number): number {
        const configured = Math.floor(this.columns);
        return configured > 0 ? configured : Math.max(1, Math.ceil(Math.sqrt(Math.max(1, n))));
    }

    private rowCount(n: number, cols: number): number {
        const configured = Math.floor(this.rows);
        return configured > 0 ? configured : Math.max(1, Math.ceil(n / cols));
    }

    private cellSlots(items: Item[]): { columns: number; rows: number; slots: Slot[] } {
        const baseColumns = this.colCount(items.length);
        const baseRows = this.rowCount(items.length, baseColumns);
        let columns = baseColumns;
        let rows = baseRows;
        const slots = items.map((item, index) => {
            const cell = item.node.getComponent(FlexalonGridCell);
            // Explicit GridCell overrides may extend the grid bounds, but must
            // never change the sequential placement of later automatic cells.
            const autoColumn = this.startAxis === Axis.y ? Math.floor(index / baseRows) : index % baseColumns;
            const autoRow = this.startAxis === Axis.y ? index % baseRows : Math.floor(index / baseColumns);
            const column = Math.max(0, cell && Number.isFinite(cell.column) && cell.column >= 0 ? Math.floor(cell.column) : autoColumn);
            const row = Math.max(0, cell && Number.isFinite(cell.row) && cell.row >= 0 ? Math.floor(cell.row) : autoRow);
            const spanC = Math.max(1, cell && Number.isFinite(cell.columnSpan) ? Math.floor(cell.columnSpan) : 1);
            const spanR = Math.max(1, cell && Number.isFinite(cell.rowSpan) ? Math.floor(cell.rowSpan) : 1);
            columns = Math.max(columns, column + spanC);
            rows = Math.max(rows, row + spanR);
            return { item, column, row, spanC, spanR };
        });
        // Overrides / spans outside nominal row or column counts must not yield
        // a negative cell width (the previous code clamped span, not indices).
        return { columns, rows, slots };
    }

    private dimensionForSpan(sizes: number[], start: number, count: number, gap: number): number {
        let sum = (count - 1) * gap;
        for (let i = start; i < start + count; i++) sum += sizes[i];
        return sum;
    }

    private contentTracks(slots: Slot[], count: number, axis: 'x' | 'y', gap: number): number[] {
        const tracks = new Array<number>(count).fill(0);
        // Resolve 1-cell constraints before multispan constraints. For a child
        // spanning N cells, grow each of those N tracks only by the shortfall/N.
        // This lets independent columns/rows retain their own natural widths.
        const ordered = slots.slice().sort((a, b) => (axis === 'x' ? a.spanC - b.spanC : a.spanR - b.spanR));
        for (const slot of ordered) {
            const start = axis === 'x' ? slot.column : slot.row;
            const span = axis === 'x' ? slot.spanC : slot.spanR;
            const natural = axis === 'x' ? slot.item.outer.x : slot.item.outer.y;
            const shortfall = natural - this.dimensionForSpan(tracks, start, span, gap);
            if (shortfall > 0) for (let k = start; k < start + span; k++) tracks[k] += shortfall / span;
        }
        return tracks;
    }

    private uniformMinimum(slots: Slot[], axis: 'x' | 'y', gap: number, hex: boolean): number {
        let required = 0;
        for (const slot of slots) {
            const outer = axis === 'x' ? slot.item.outer.x : slot.item.outer.y;
            const span = axis === 'x' ? slot.spanC : slot.spanR;
            const multiplier = axis === 'y' && hex ? 1 + 0.75 * (span - 1) : span;
            const minimum = (outer - gap * (span - 1)) / multiplier;
            required = Math.max(required, minimum);
        }
        return Math.max(0, required);
    }

    /** Intrinsic children have Fill=0 (+ minSize), preventing Layout/Fill feedback loops. */
    private geometry(items: Item[], inner: Vec3, intrinsic: boolean): GridGeometry {
        const { columns, rows, slots } = this.cellSlots(items);
        const hex = this.cellType === GridCellType.Hexagonal;
        const fit = !hex && this.cellSizing === GridCellSizing.FitChildren;
        const minW = this.uniformMinimum(slots, 'x', this.columnGap, hex);
        const minH = this.uniformMinimum(slots, 'y', this.rowGap, hex);
        let widths: number[], heights: number[];
        if (fit) {
            widths = this.contentTracks(slots, columns, 'x', this.columnGap);
            heights = this.contentTracks(slots, rows, 'y', this.rowGap);
        } else {
            const rowExtent = hex ? 1 + 0.75 * (rows - 1) : rows;
            const columnExtent = columns + (hex && rows > 1 ? 0.5 : 0);
            const availableW = (inner.x - (columns - 1) * this.columnGap) / columnExtent;
            const availableH = (inner.y - (rows - 1) * this.rowGap) / rowExtent;
            const cellW = Math.max(minW, intrinsic ? 0 : availableW, 0);
            const cellH = Math.max(minH, intrinsic ? 0 : availableH, 0);
            widths = new Array(columns).fill(cellW);
            heights = new Array(rows).fill(cellH);
        }
        const gridWidth = widths.reduce((a, b) => a + b, 0) + (columns - 1) * this.columnGap + (hex && rows > 1 ? widths[0] * 0.5 : 0);
        const gridHeight = hex
            ? heights[0] + Math.max(0, rows - 1) * (heights[0] * 0.75 + this.rowGap)
            : heights.reduce((a, b) => a + b, 0) + (rows - 1) * this.rowGap;
        return { columns, rows, slots, widths, heights, gridWidth, gridHeight };
    }

    public measureIntrinsic(available: Vec3): Vec3 {
        const items = this.items(this.contentSize(available), true);
        if (!items.length) {
            return new Vec3(this.paddingLeft + this.paddingRight, this.paddingTop + this.paddingBottom, this.paddingFront + this.paddingBack);
        }
        const g = this.geometry(items, this.contentSize(available), true);
        return new Vec3(g.gridWidth + this.paddingLeft + this.paddingRight, g.gridHeight + this.paddingTop + this.paddingBottom, 1);
    }

    public arrangeChildren(size: Vec3): void {
        const inner = this.contentSize(size);
        const items = this.items(inner);
        if (!items.length) return;
        // When computing required cell sizes, only intrinsically sized children
        // contribute; a Fill child should grow to its cell, not grow that cell.
        const naturalItems = this.items(inner, true);
        const measured = this.geometry(naturalItems, inner, false);
        const byNode = new Map(items.map(item => [item.node, item]));
        const hex = this.cellType === GridCellType.Hexagonal;
        const fromRight = this.startCorner === GridCorner.BottomRight || this.startCorner === GridCorner.TopRight;
        const fromTop = this.startCorner === GridCorner.TopRight || this.startCorner === GridCorner.TopLeft;
        const xPrefixes = [0];
        const yPrefixes = [0];
        for (const width of measured.widths) xPrefixes.push(xPrefixes[xPrefixes.length - 1] + width);
        for (const height of measured.heights) yPrefixes.push(yPrefixes[yPrefixes.length - 1] + height);
        measured.slots.forEach((slot, index) => {
            const item = byNode.get(slot.item.node)!;
            const { column, row, spanC, spanR } = slot;
            const cellWidth = this.dimensionForSpan(measured.widths, column, spanC, this.columnGap);
            const cellHeight = hex
                ? measured.heights[0] * (1 + (spanR - 1) * 0.75) + (spanR - 1) * this.rowGap
                : this.dimensionForSpan(measured.heights, row, spanR, this.rowGap);
            const s = item.size.clone();
            if (item.object?.widthType === SizeType.Fill) s.x = Math.max(0, cellWidth - item.marginLeft - item.marginRight) * item.object.fraction(0);
            if (item.object?.heightType === SizeType.Fill) s.y = Math.max(0, cellHeight - item.marginTop - item.marginBottom) * item.object.fraction(1);
            this.setItemSize(item, s);
            const cellLeft = -measured.gridWidth / 2 + xPrefixes[column] + column * this.columnGap;
            const oddOffset = hex && row % 2 !== 0 ? measured.widths[0] / 2 : 0;
            const x = (fromRight ? -1 : 1) * (cellLeft + cellWidth / 2 + oddOffset);
            const rowTop = measured.gridHeight / 2 - (hex ? row * (measured.heights[0] * 0.75 + this.rowGap) : yPrefixes[row] + row * this.rowGap);
            const y = (fromTop ? 1 : -1) * (rowTop - cellHeight / 2);
            const dx = (cellWidth - item.outer.x) * (align01(this.horizontalAlign) - 0.5);
            const dy = (cellHeight - item.outer.y) * (align01(this.verticalAlign) - 0.5);
            this.place(item, new Vec3(x + dx, y + dy, 0), size, index);
        });
    }
}
