import { _decorator, Component, Vec3, Quat } from 'cc';
const { ccclass, executeInEditMode } = _decorator;
/** Read-only-at-runtime measurement outputs; maintained by the engine. */
@ccclass('Flexalon.FlexalonResult')
@executeInEditMode
export class FlexalonResult extends Component {
    public LayoutPosition = new Vec3();
    public LayoutRotation = new Quat();
    public LayoutSize = new Vec3();
    public FillSize = new Vec3();
    public ShrinkSize = new Vec3();
    public SiblingIndex = 0;
}
