declare function require(module:string):any;
// Scene script runs inside the Cocos editor scene process, not the extension's Node.js process.
export const methods = {
    inspectLayouts() {
        const { director, js, UITransform } = require('cc');
        const root=director.getScene();
        const report:{layoutCount:number, objectCount:number, problems:string[]}={layoutCount:0,objectCount:0,problems:[]};
        if(!root){report.problems.push('No active scene.');return report;}
        const visit=(node:any):void=>{
            const flexComponents=node.components.filter((c:any)=>js.getClassName(c).startsWith('Flexalon.'));
            for(const c of flexComponents){
                const name=js.getClassName(c);
                if(name==='Flexalon.FlexalonObject') report.objectCount++;
                if(name.endsWith('Layout') && name!=='Flexalon.LayoutBase') {
                    report.layoutCount++;
                    if(!node.getComponent(UITransform))report.problems.push(`${node.name}: missing UITransform; uses unit size 1 on non-UI nodes`);
                }
            }
            for(const child of node.children) visit(child);
        };
        visit(root);
        return report;
    },
    refreshLayouts(){
        const {director,js}=require('cc');
        const root=director.getScene();let refreshed=0,sized=0;
        if(!root)return {refreshed,error:'No active scene'};
        // Standalone objects have no layout parent. Their Fixed dimensions must
        // still be synchronized by the explicit Editor refresh command.
        const syncObjects=(node:any):void=>{
            for(const component of node.components){
                if(js.getClassName(component)==='Flexalon.FlexalonObject' && component.enabled && typeof component.SyncFixedUIContentSize==='function'){
                    component.SyncFixedUIContentSize();sized++;
                }
            }
            for(const child of node.children)syncObjects(child);
        };
        syncObjects(root);
        const walk=(node:any, hasActiveAncestor:boolean):void=>{
            const layout=node.components.find((c:any)=>js.getClassName(c).startsWith('Flexalon.') && js.getClassName(c).endsWith('Layout') && js.getClassName(c)!=='Flexalon.LayoutBase');
            const active=!!(layout&&layout.enabled&&node.active);
            if(active && !hasActiveAncestor && typeof layout.ForceUpdate==='function'){layout.ForceUpdate();refreshed++;}
            for(const child of node.children)walk(child,hasActiveAncestor || active);
        };
        walk(root,false);return {refreshed,sized};
    }
};
export function load():void {}
export function unload():void {}
