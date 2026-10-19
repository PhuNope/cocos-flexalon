import { UITransform, MeshRenderer, Node, Vec3 } from 'cc';
/** Adapt measurement to Cocos UITransform; non-UI 3D objects use scale-independent unit dimensions by default. */
export interface Adapter { measure(node: Node): Vec3; }
export class DefaultAdapter implements Adapter {
    measure(node: Node): Vec3 {
        const ui = node.getComponent(UITransform);
        if(ui) return new Vec3(Math.max(0,ui.width), Math.max(0,ui.height), 1);
        // Cocos mesh metadata is analogous to Unity MeshRenderer.localBounds.
        const mesh = node.getComponent(MeshRenderer)?.mesh;
        const min = mesh?.struct?.minPosition;
        const max = mesh?.struct?.maxPosition;
        if(min && max) return new Vec3(Math.max(0,max.x-min.x),Math.max(0,max.y-min.y),Math.max(0,max.z-min.z));
        return new Vec3(1,1,1);
    }
}
export const defaultAdapter = new DefaultAdapter();
