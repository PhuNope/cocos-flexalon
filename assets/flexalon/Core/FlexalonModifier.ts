import { Node, Vec3 } from 'cc';
export interface FlexalonModifier { modify(node: Node, index: number, position: Vec3): Vec3; }
