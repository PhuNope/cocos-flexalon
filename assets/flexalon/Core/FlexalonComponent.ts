import { _decorator, Component } from 'cc';
const { ccclass, executeInEditMode } = _decorator;
/** Common API used by Flexalon components. */
@ccclass('Flexalon.FlexalonComponent')
@executeInEditMode
export class FlexalonComponent extends Component {
    protected _dirty = true;
    private _lastConfig = '';

    /**
     * Inspector can mutate nested Vec3 values without calling setters.
     * Observe a light signature in lateUpdate; never recompute Layout unless
     * an event, property change, or explicit MarkDirty invalidates it.
     */
    protected configurationChanged(): boolean {
        const parts: string[] = [];
        for (const key of Object.keys(this)) {
            if (key.startsWith('_') || key === 'node' || key === 'name') continue;
            const value = (this as unknown as Record<string, unknown>)[key];
            if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
                parts.push(key, String(value));
            } else if (value && typeof value === 'object') {
                const vec = value as { x?: unknown; y?: unknown; z?: unknown; w?: unknown };
                if (typeof vec.x === 'number' && typeof vec.y === 'number') {
                    parts.push(key, String(vec.x), String(vec.y), String(vec.z ?? ''), String(vec.w ?? ''));
                } else if (Array.isArray(value) && value.length <= 128) {
                    parts.push(key, JSON.stringify(value));
                }
            }
        }
        const signature = parts.join('|');
        if (signature === this._lastConfig) return false;
        this._lastConfig = signature;
        return true;
    }

    protected onEnable(): void { this.MarkDirty(); }
    protected onDisable(): void { this.MarkDirty(); }
    protected lateUpdate(): void {
        if (this.configurationChanged()) this.MarkDirty();
    }

    public MarkDirty(): void {
        this._dirty = true;
        // Bubble invalidation through nested Flexalon layouts without
        // importing LayoutBase (avoids a cyclic module import).
        for (let parent = this.node?.parent; parent; parent = parent.parent) {
            const layout = parent.getComponents(FlexalonComponent).find(c =>
                c.enabledInHierarchy && typeof (c as any).arrangeChildren === 'function' &&
                typeof (c as any).measureIntrinsic === 'function');
            if (layout) { layout.MarkDirty(); break; }
        }
    }
    public ForceUpdate(): void { this.MarkDirty(); }
}
