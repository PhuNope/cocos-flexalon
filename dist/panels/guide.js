"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('node:fs');
const path = require('node:path');
const ui = require('./guide/client.js');
const docs = require('./guide/content.js');
module.exports = Editor.Panel.define({
    template: fs.readFileSync(path.join(__dirname, 'guide/index.html'), 'utf8'),
    style: fs.readFileSync(path.join(__dirname, 'guide/index.css'), 'utf8'),
    $: { app: '#guide-app' },
    ready() { this.__guideApp = ui.mount(this.$.app, docs); },
    methods: { openTopic(componentName) { this.__guideApp?.go(componentName); } },
    close() { this.__guideApp?.destroy(); this.__guideApp = null; }
});
