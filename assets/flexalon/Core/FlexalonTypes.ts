import { Enum, Vec3 } from 'cc';

/** Coordinate conventions: +X right, +Y up, +Z forward; UI sizes in UITransform units. */
export enum Direction { PositiveX = 0, NegativeX = 1, PositiveY = 2, NegativeY = 3, PositiveZ = 4, NegativeZ = 5 }
export enum Axis { x = 0, y = 1, z = 2 }
export enum Align { Start = 0, Center = 1, End = 2 }
export enum Plane { XY = 0, XZ = 1, ZY = 2 }
export enum SizeType { Fixed = 0, Fill = 1, Component = 2, Layout = 3 }
export enum MinMaxSizeType { None = 0, Fixed = 1, Fill = 2 }
export enum GapOptions { Fixed = 0, SpaceBetween = 1, SpaceAround = 2, SpaceEvenly = 3 }
/** Matches Flexalon Unity Circle RadiusOptions: constant, per-child step, per-revolution step. */
export enum CircleRadiusType { Constant = 0, Step = 1, Wrap = 2 }
/** Fixed: explicit degrees per child; Evenly: distribute children across arcAngle. */
export enum CircleSpacingType { Fixed = 0, Evenly = 1 }
export enum GridCellType { Rectangle = 0, Hexagonal = 1 }
/** Uniform keeps evenly sized cells; FitChildren uses per-column/per-row content dimensions (rectangular grids only). */
export enum GridCellSizing { Uniform = 0, FitChildren = 1 }
export enum GridCorner { BottomLeft = 0, BottomRight = 1, TopRight = 2, TopLeft = 3 }
export enum ShapeType { Rectangle = 0, Ellipse = 1, Polygon = 2 }
for (const e of [Direction, Axis, Align, Plane, SizeType, MinMaxSizeType, GapOptions, CircleRadiusType, CircleSpacingType, GridCellType, GridCellSizing, GridCorner, ShapeType]) Enum(e);

export class Directions {
    constructor(public Right = 0, public Left = 0, public Top = 0, public Bottom = 0, public Back = 0, public Front = 0) {}
    get Size(): Vec3 { return new Vec3(this.Right + this.Left, this.Top + this.Bottom, this.Back + this.Front); }
    get Center(): Vec3 { return new Vec3((this.Left - this.Right) / 2, (this.Bottom - this.Top) / 2, (this.Back - this.Front) / 2); }
    Equals(d: Directions, epsilon = 0.00001): boolean { return [this.Right-d.Right, this.Left-d.Left, this.Top-d.Top, this.Bottom-d.Bottom, this.Back-d.Back, this.Front-d.Front].every(x => Math.abs(x) <= epsilon); }
}
export const axisIndex = (d: Direction): number => Math.floor(d / 2);
export const axisSign = (d: Direction): number => d % 2 === 0 ? 1 : -1;
export const align01 = (a: Align): number => a === Align.Start ? 0 : a === Align.End ? 1 : 0.5;
export function axisValue(v: Vec3, a: number): number { return a === 0 ? v.x : a === 1 ? v.y : v.z; }
export function setAxis(v: Vec3, a: number, x: number): void { if (a === 0) v.x = x; else if (a === 1) v.y = x; else v.z = x; }
export function finitePositive(v: number): number { return Number.isFinite(v) ? Math.max(0, v) : 0; }
