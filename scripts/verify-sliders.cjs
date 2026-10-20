'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..','assets','flexalon');
const sliderPattern=/@property\s*\(\s*\{[^}]*\bslide\s*:\s*true[^}]*\}\s*\)/gs;
const rangePattern=/\brange\s*:\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\]/;
let checked=0;
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const fp=path.join(dir,ent.name);
    if(ent.isDirectory()){walk(fp);continue;}
    if(!ent.name.endsWith('.ts'))continue;
    const content=fs.readFileSync(fp,'utf8');
    for(const match of content.matchAll(sliderPattern)){
      const label=path.relative(root,fp);
      const range=match[0].match(rangePattern);
      assert.ok(range,`Slider missing [min,max,step]: ${label}`);
      const [min,max,step]=range.slice(1).map(Number);
      assert.ok(Number.isFinite(min)&&Number.isFinite(max)&&Number.isFinite(step)&&max>min&&step>0&&step<=(max-min)/10,`Invalid slider step in ${label}`);
      checked++;
    }
  }
}
walk(root);
assert.equal(checked,2,'New slider definitions require review');
console.log(`PASS: ${checked} sliders have usable min/max/step`);
