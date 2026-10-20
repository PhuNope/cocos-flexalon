import { FlexalonObject } from '../Core/FlexalonObject';
import { _decorator, Color, Enum, UITransform, Vec3 } from 'cc';
import { LayoutBase, Item } from '../Core/FlexalonLayoutBase';
import { Align, Axis, GridCorner, GridCellType, GridCellSizing, SizeType, align01 } from '../Core/FlexalonTypes';
import { FlexalonGridCell } from './FlexalonGridCell';
import { flexalonGizmos, drawLocalLineList, drawLocalLabel, rect } from '../Core/FlexalonGizmos';

const { ccclass, property, menu, executeInEditMode, requireComponent } = _decorator;

type Slot = { item: Item; column: number; row: number; spanC: number; spanR: number };
type GridGeometry = {
    columns: number; rows: number; slots: Slot[];
    widths: number[]; heights: number[];
    xPrefixes: number[]; yPrefixes: number[];
    gridWidth: number; gridHeight: number;
};
type CellGeometry = { x: number; y: number; width: number; height: number };

const GRID_LINE_COLOR = new Color(92, 173, 228, 185);
const GRID_OCCUPIED_COLOR = new Color(255, 180, 64, 235);
const GRID_GAP_COLOR = new Color(186, 115, 232, 205);
const GRID_LABEL_COLOR = new Color(244, 244, 244, 235);
/** Avoid spawning thousands of Graphics/Label draw calls in the Scene Editor. */
const MAX_VISIBLE_CELLS = 400;
const MAX_VISIBLE_LABELS = 80;

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

    @property({tooltip: 'Vẽ Gizmos lưới khi chọn Grid Layout (cần Cocos-Gizmos).', visible: true}) public showGrid = true;
    @property({tooltip: 'Vẽ đường bao từng cell theo cấu hình Grid hiện tại, kể cả cell trống.', visible: true}) public showCellBounds = true;
    @property({tooltip: 'Đánh dấu các cell được child sử dụng, kể cả Column/Row Span.', visible: true}) public showOccupiedCells = true;
    @property({tooltip: 'Hiển thị khoảng Column Gap / Row Gap. Chỉ hiển thị giá trị dương.', visible: true}) public showGridGaps = false;
    @property({tooltip: 'Hiển thị chỉ số cột/hàng trên cell (giới hạn 80 nhãn để tránh nặng Editor).', visible: true}) public showCellIndex = false;


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
        const xPrefixes = [0];
        const yPrefixes = [0];
        for (const w of widths) xPrefixes.push(xPrefixes[xPrefixes.length - 1] + w);
        for (const h of heights) yPrefixes.push(yPrefixes[yPrefixes.length - 1] + h);
        return { columns, rows, slots, widths, heights, xPrefixes, yPrefixes, gridWidth, gridHeight };
    }

    /** Same cell geometry is used by arrangeChildren() and Gizmos. */
    private cellGeometry(g: GridGeometry, column: number, row: number, spanC = 1, spanR = 1): CellGeometry {
        const hex = this.cellType === GridCellType.Hexagonal;
        const fromRight = this.startCorner === GridCorner.BottomRight || this.startCorner === GridCorner.TopRight;
        const fromTop = this.startCorner === GridCorner.TopRight || this.startCorner === GridCorner.TopLeft;
        const width = this.dimensionForSpan(g.widths, column, spanC, this.columnGap);
        const height = hex
            ? g.heights[0] * (1 + (spanR - 1) * 0.75) + (spanR - 1) * this.rowGap
            : this.dimensionForSpan(g.heights, row, spanR, this.rowGap);
        const cellLeft = -g.gridWidth / 2 + g.xPrefixes[column] + column * this.columnGap;
        const oddOffset = hex && row % 2 !== 0 ? g.widths[0] / 2 : 0;
        const x = (fromRight ? -1 : 1) * (cellLeft + width / 2 + oddOffset);
        const rowTop = g.gridHeight / 2 - (hex
            ? row * (g.heights[0] * 0.75 + this.rowGap)
            : g.yPrefixes[row] + row * this.rowGap);
        const y = (fromTop ? 1 : -1) * (rowTop - height / 2);
        return { x, y, width, height };
    }

    private drawCell(gizmo: NonNullable<ReturnType<typeof flexalonGizmos>>,
        cell: CellGeometry, origin: Vec3, hex: boolean): void {
        const x = cell.x + origin.x, y = cell.y + origin.y;
        if (![x, y, cell.width, cell.height].every(Number.isFinite)) return;
        if (hex) {
            // Pointy-top hexagon inscribed in the same width/height used by Grid.
            const pts = Array.from({length: 6}, (_, k) => {
                const a = -Math.PI / 2 + k * Math.PI / 3;
                return { x: x + Math.cos(a) * cell.width / Math.sqrt(3),
                    y: y + Math.sin(a) * cell.height / 2 };
            });
            drawLocalLineList(gizmo, this.node, pts, true);
        } else {
            rect(gizmo, this.node, x - cell.width / 2, y - cell.height / 2,
                Math.max(0, cell.width), Math.max(0, cell.height));
        }
    }

    private drawGridGap(gizmo: NonNullable<ReturnType<typeof flexalonGizmos>>,
        a: CellGeometry, b: CellGeometry, origin: Vec3, horizontal: boolean, hex: boolean): void {
        const configuredGap = horizontal ? this.columnGap : this.rowGap;
        if (!(configuredGap > 0)) return;
        const dir = Math.sign(horizontal ? b.x - a.x : b.y - a.y);
        if (!dir) return;
        // Actual facing bounds differ for FitChildren tracks. Hexagonal rows
        // overlap by 25% of cell height, so show their configured row spacing
        // as a centred tick instead of a (non-existent) rectangular void.
        const facingA = horizontal ? a.width / 2 : a.height / 2;
        const facingB = horizontal ? b.width / 2 : b.height / 2;
        const from = hex && !horizontal
            ? ((a.y + b.y) / 2 - dir * configuredGap / 2)
            : (horizontal ? a.x : a.y) + dir * facingA;
        const to = hex && !horizontal
            ? ((a.y + b.y) / 2 + dir * configuredGap / 2)
            : (horizontal ? b.x : b.y) - dir * facingB;
        const points = horizontal
            ? [{x: origin.x + from, y: origin.y + a.y},
               {x: origin.x + to, y: origin.y + a.y}]
            : [{x: origin.x + a.x, y: origin.y + from},
               {x: origin.x + a.x, y: origin.y + to}];
        drawLocalLineList(gizmo, this.node, points);
    }

    public override onDrawGizmosSelected(): void {
        super.onDrawGizmosSelected();
        if (!this.showGizmos || !this.showGrid || !this.node) return;
        const gizmo = flexalonGizmos();
        const ui = this.node.getComponent(UITransform);
        if (!gizmo || !ui) return;
        const size = new Vec3(ui.width, ui.height, 1);
        const inner = this.contentSize(size);
        // EXACT same intrinsic track measurement as arrangeChildren().
        const g = this.geometry(this.items(inner, true), inner, false);
        const origin = this.contentCenter(size);
        const hex = this.cellType === GridCellType.Hexagonal;
        if (!Number.isFinite(g.gridWidth) || !Number.isFinite(g.gridHeight)) return;

        gizmo.beginColor(this.node, GRID_LINE_COLOR);
        if (!hex) rect(gizmo, this.node, origin.x - g.gridWidth / 2, origin.y - g.gridHeight / 2,
            Math.max(0, g.gridWidth), Math.max(0, g.gridHeight));

        const total = Math.min(MAX_VISIBLE_CELLS, g.columns * g.rows);
        if (this.showCellBounds || this.showCellIndex || this.showGridGaps) {
            for (let i = 0; i < total; i++) {
                const row = Math.floor(i / g.columns), column = i % g.columns;
                const cell = this.cellGeometry(g, column, row);
                if (this.showCellBounds) {
                    gizmo.beginColor(this.node, GRID_LINE_COLOR);
                    this.drawCell(gizmo, cell, origin, hex);
                }
                if (this.showGridGaps) {
                    gizmo.beginColor(this.node, GRID_GAP_COLOR);
                    if (column + 1 < g.columns) this.drawGridGap(gizmo, cell,
                        this.cellGeometry(g, column + 1, row), origin, true, hex);
                    if (row + 1 < g.rows) this.drawGridGap(gizmo, cell,
                        this.cellGeometry(g, column, row + 1), origin, false, hex);
                }
                if (this.showCellIndex && i < MAX_VISIBLE_LABELS) {
                    gizmo.beginColor(this.node, GRID_LABEL_COLOR);
                    drawLocalLabel(gizmo, this.node, `grid-cell-${this.node.uuid}-${column}-${row}`,
                        `${column + 1},${row + 1}`, {x: origin.x + cell.x, y: origin.y + cell.y}, 12);
                }
            }
        }
        if (this.showOccupiedCells) {
            gizmo.beginColor(this.node, GRID_OCCUPIED_COLOR);
            for (const slot of g.slots.slice(0, MAX_VISIBLE_CELLS)) {
                const cell = this.cellGeometry(g, slot.column, slot.row, slot.spanC, slot.spanR);
                // Single hex cell is a hexagon; multispan uses the actual span
                // bounding rectangle as arranged by the Grid implementation.
                this.drawCell(gizmo, cell, origin, hex && slot.spanC === 1 && slot.spanR === 1);
            }
        }
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
        measured.slots.forEach((slot, index) => {
            const item = byNode.get(slot.item.node)!;
            const { column, row, spanC, spanR } = slot;
            const cell = this.cellGeometry(measured, column, row, spanC, spanR);
            const cellWidth = cell.width, cellHeight = cell.height;
            const s = item.size.clone();
            if (item.object?.widthType === SizeType.Fill) s.x = Math.max(0, cellWidth - item.marginLeft - item.marginRight) * item.object.fraction(0);
            if (item.object?.heightType === SizeType.Fill) s.y = Math.max(0, cellHeight - item.marginTop - item.marginBottom) * item.object.fraction(1);
            this.setItemSize(item, s);
            const dx = (cellWidth - item.outer.x) * (align01(this.horizontalAlign) - 0.5);
            const dy = (cellHeight - item.outer.y) * (align01(this.verticalAlign) - 0.5);
            this.place(item, new Vec3(cell.x + dx, cell.y + dy, 0), size, index);
        });
    }
}
