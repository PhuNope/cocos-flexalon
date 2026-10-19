// Cocos Creator >= 3.8.2 extension panel. Offline resources copied to dist/panels/guide.
declare const Editor: any;
declare const module: any;
declare const require: (id: string) => any;
declare const __dirname: string;
const fs = require('node:fs');
const path = require('node:path');
const ui = require('./guide/client.js');
const docs = require('./guide/content.js');
module.exports = Editor.Panel.define({
    template: fs.readFileSync(path.join(__dirname, 'guide/index.html'), 'utf8'),
    style: fs.readFileSync(path.join(__dirname, 'guide/index.css'), 'utf8'),
    $: {app: '#guide-app'},
    ready(this: any) { this.__guideApp = ui.mount(this.$.app, docs); },
    methods: { openTopic(this:any, componentName: string) {this.__guideApp?.go(componentName)}},
    close(this:any) {this.__guideApp?.destroy(); this.__guideApp = null;}
});
