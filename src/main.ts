/** Cocos Creator editor main process. Updater runs only in the Editor, not game runtime. */
declare const Editor: any;
declare const require: (name: string) => any;
declare const __dirname: string;
const path = require('node:path');
const pkg = 'flexalon-tools';
const { UpdateService } = require('../updater/service.cjs');
const updater = new UpdateService(path.resolve(__dirname, '..'), Editor);
let autoTimer: any = null;
async function scene(method: string): Promise<any> {
    try {return await Editor.Message.request('scene', 'execute-scene-script', { name: pkg, method, args: [] });}
    catch(error) { console.error(`[Flexalon] ${method} failed`,error); return null; }
}
export const methods = {
    onSceneReady() { void updater.markSceneReady(); },
    async openGuide() {
        try { await Editor.Panel.open('flexalon-tools.guide'); }
        catch(error) { console.error('[Flexalon] Cannot open Guide Panel',error); }
    },
    async openUpdateTab() { updater.openUpdateOnNext=true; await methods.openGuide(); },
    async checkUpdate() {return updater.check(true);},
    getUpdateStatus() {
        const open=updater.openUpdateOnNext===true;
        updater.openUpdateOnNext=false;
        return {...updater.snapshot(),openUpdateTab:open};
    },
    async startUpdate() {return updater.start();},
    async inspectLayouts() {
        const result = await scene('inspectLayouts');
        if(result) console.info('[Flexalon] Scene diagnostics:',JSON.stringify(result,null,2));
        return result;
    },
    async refreshLayouts() {
        const result = await scene('refreshLayouts');
        if(result) console.info('[Flexalon] Refreshed:',JSON.stringify(result));
        return result;
    }
};
export function load():void {
    // Fetch release metadata in the background, but only show the popup when
    // Cocos has finished initializing the active scene.
    autoTimer=setTimeout(()=>{void updater.autoCheck();},0);
    // If the extension is reloaded after scene:ready was broadcast, recover
    // the already-ready state without waiting for another scene change.
    void Editor.Message.request('scene','query-is-ready')
      .then((ready:any)=>{if(ready===true)void updater.markSceneReady();})
      .catch(()=>{});
}
export function unload():void { if(autoTimer)clearTimeout(autoTimer);updater.dispose(); }
