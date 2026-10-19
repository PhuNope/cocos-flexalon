import { _decorator, Component, director, Node } from 'cc';
import { LayoutBase } from './FlexalonLayoutBase';
import { FlexalonNode } from './FlexalonNode';
const { ccclass, executeInEditMode, menu, property } = _decorator;
/** Optional scene manager and scripting entry point; layouts can work without placing this component. */
@ccclass('Flexalon.Flexalon')
@executeInEditMode
@menu('Flexalon/Flexalon Manager')
export class Flexalon extends Component {
    @property({tooltip: "Cho phép hệ thống Flexalon tổng cập nhật layout trong Scene Editor.", visible: true}) public updateInEditMode = true;
    @property({tooltip: "Cho phép hệ thống Flexalon tổng cập nhật layout trong Preview / Runtime.", visible: true}) public updateInPlayMode = true;
    private static instance: Flexalon | null = null;
    static Get(): Flexalon | null { return this.instance?.isValid ? this.instance : null; }
    static GetOrCreate(): Flexalon {
        const existing=this.Get();if(existing) return existing;
        const scene=director.getScene();if(!scene) throw new Error('Flexalon: no active scene');
        const holder=scene.getChildByName('Flexalon')??new Node('Flexalon');
        if(!holder.parent) holder.parent=scene;
        return holder.getComponent(Flexalon)??holder.addComponent(Flexalon);
    }
    static GetNode(go: Node): FlexalonNode { return FlexalonNode.Get(go); }
    static GetOrCreateNode(go: Node): FlexalonNode { return FlexalonNode.Get(go); }
    protected onEnable(): void { Flexalon.instance=this; }
    protected onDestroy(): void { if(Flexalon.instance===this) Flexalon.instance=null; }
    public ForceUpdate(): void { this.UpdateDirtyNodes(); }
    public UpdateDirtyNodes(): void {
        const scene=director.getScene();if(!scene)return;
        const walk=(node:Node, parentLayout:boolean):void=>{
            const layout=node.getComponent(LayoutBase);
            const active=!!(layout && layout.enabledInHierarchy && node.activeInHierarchy);
            if(active && !parentLayout) layout!.ForceUpdate();
            for(const child of node.children) walk(child,parentLayout || active);
        };
        walk(scene,false);
    }
}
