import { Node, Vec3 } from 'cc';
import { FlexalonMath } from './FlexalonMath';
export interface TransformUpdater { update(node: Node, position: Vec3): void; }
export class DefaultTransformUpdater implements TransformUpdater {
    update(node: Node, position: Vec3): void { if (!FlexalonMath.VecApproximately(node.position,position)) node.setPosition(position); }
}
