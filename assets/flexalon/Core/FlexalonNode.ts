import { Node, Vec3 } from 'cc';
import { FlexalonObject } from './FlexalonObject';
import { FlexalonResult } from './FlexalonResult';
import { defaultAdapter } from './FlexalonAdapter';
/** Cocos wrapper, never constructed with `new Node()` in place of Flexalon data. */
export class FlexalonNode {
    private static map = new WeakMap<Node, FlexalonNode>();
    static Get(node: Node): FlexalonNode { let f=this.map.get(node); if(!f){ f = new FlexalonNode(node); this.map.set(node,f); } return f; }
    private constructor(public readonly GameObject: Node) {}
    get Parent(): FlexalonNode | null { return this.GameObject.parent ? FlexalonNode.Get(this.GameObject.parent) : null; }
    get Children(): ReadonlyArray<FlexalonNode> { return this.GameObject.children.map(c=>FlexalonNode.Get(c)); }
    get Index(): number { return this.GameObject.getSiblingIndex(); }
    get FlexalonObject(): FlexalonObject | null { return this.GameObject.getComponent(FlexalonObject); }
    get Result(): FlexalonResult | null { return this.GameObject.getComponent(FlexalonResult); }
    get Size(): Vec3 { return this.FlexalonObject?.size.clone() ?? defaultAdapter.measure(this.GameObject); }
    MarkDirty(): void {
        for (let node: Node | null = this.GameObject; node; node = node.parent) {
            const layout = node.getComponents('Flexalon.LayoutBase')
                .find(c => c.enabledInHierarchy && typeof (c as any).MarkDirty === 'function') as
                { MarkDirty(): void } | undefined;
            if (layout) { layout.MarkDirty(); return; }
        }
    }
    ForceUpdate(): void {
        for (let node: Node | null = this.GameObject; node; node = node.parent) {
            const layout = node.getComponents('Flexalon.LayoutBase')
                .find(c => c.enabledInHierarchy && typeof (c as any).ForceUpdate === 'function') as
                { ForceUpdate(): void } | undefined;
            if (layout) { layout.ForceUpdate(); return; }
        }
    }
}
