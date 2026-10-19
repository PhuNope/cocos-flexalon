declare const Editor: { Message: { request(channel: string, command: string, payload: object): Promise<any> }; Panel: {open(name:string):Promise<any>} };
const pkg = 'flexalon-tools';
async function scene(method: string): Promise<any> {
    try {return await Editor.Message.request('scene', 'execute-scene-script', { name: pkg, method, args: [] });}
    catch(error) { console.error(`[Flexalon] ${method} failed`,error); return null; }
}
export const methods = {
    async openGuide() {
        try { await Editor.Panel.open('flexalon-tools.guide'); }
        catch(error) { console.error('[Flexalon] Cannot open Guide Panel',error); }
    },
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
export function load():void {}
export function unload():void {}
