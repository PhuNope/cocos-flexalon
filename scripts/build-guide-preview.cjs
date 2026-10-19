'use strict';
/** Generate a self-contained offline HTML manual for preview outside Cocos Editor. */
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const assets=path.resolve(__dirname,'../src/panels/guide');
const docsDir=path.join(root,'docs');fs.mkdirSync(docsDir,{recursive:true});
const css=fs.readFileSync(path.join(assets,'index.css'),'utf8');
const panel=fs.readFileSync(path.join(assets,'index.html'),'utf8');
const client=fs.readFileSync(path.join(assets,'client.js'),'utf8');
const content=fs.readFileSync(path.join(assets,'content.js'),'utf8');
const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Flexalon Cocos — Hướng dẫn component</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#10141d}body{font-family:'Segoe UI',sans-serif}${css}</style></head><body>${panel}<script>\n(function(){\nlet module={exports:{}};\n${client}\nconst guideClient=module.exports;\nmodule={exports:{}};\n${content}\nconst guideDocs=module.exports;\nwindow.__flexGuide=guideClient.mount(document.getElementById('guide-app'),guideDocs);\n})();</script></body></html>`;
const output=path.join(docsDir,'Flexalon_Guide_VI.html');fs.writeFileSync(output,html);
console.log('[Flexalon] Standalone offline guide:',output);
