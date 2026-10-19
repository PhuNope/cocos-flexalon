import { _decorator, Component } from 'cc';
const { ccclass, executeInEditMode } = _decorator;
/** Common API used by Flexalon components. */
@ccclass('Flexalon.FlexalonComponent')
@executeInEditMode
export class FlexalonComponent extends Component {
    protected _dirty = true;
    public MarkDirty(): void { this._dirty = true; }
    public ForceUpdate(): void { this.MarkDirty(); }
}
