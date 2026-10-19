import { Vec3 } from 'cc';
/** Parent layout's content bounds are centered in parent-local space. */
export interface Layout {
    measureIntrinsic(available: Vec3): Vec3;
    arrangeChildren(size: Vec3): void;
}
export interface Constraint { ForceUpdate(): void; }
