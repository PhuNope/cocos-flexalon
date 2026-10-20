'use strict';
/**
 * Cheap source-level guard for Cocos Creator Grid Gizmos.
 * Behavioral geometry tests also run against real TypeScript with Cocos mocks
 * before test ZIPs are produced; this source check runs in normal CI releases.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const grid=fs.readFileSync(path.join(root,'assets/flexalon/Layouts/FlexalonGridLayout.ts'),'utf8');
const inspector=fs.readFileSync(path.join(root,'src/contributions/inspector/shared.js'),'utf8');
const core=fs.readFileSync(path.join(root,'assets/flexalon/Core/FlexalonGizmos.ts'),'utf8');
for(const property of ['showGrid','showCellBounds','showOccupiedCells','showGridGaps','showCellIndex']){
  assert.match(grid,new RegExp('public '+property+'\\s*='));
  assert.ok(inspector.includes("'"+property+"'"),'Missing Inspector field '+property);
}
assert.ok(grid.includes('private cellGeometry('),'Grid and Gizmos must share cell geometry');
assert.ok(grid.includes('this.cellGeometry(measured, column, row, spanC, spanR)'),'Arrange must use shared cell geometry');
assert.ok(grid.includes('const cell = this.cellGeometry(g, column, row);'),'Gizmos must use shared cell geometry');
assert.ok(grid.includes('this.geometry(this.items(inner, true), inner, false)'),'Gizmos must measure tracks exactly like arrangeChildren');
assert.ok(grid.includes('this.drawCell(gizmo, cell, origin, hex && slot.spanC === 1 && slot.spanR === 1)'),'Cell spans and hexagonal layouts must be visualized');
assert.ok(grid.includes('MAX_VISIBLE_CELLS = 400')&&grid.includes('MAX_VISIBLE_LABELS = 80'),'Bound Editor draw workload');
assert.ok(core.includes('drawLocalLabel(')&&core.includes('anchorFor(node)'),'Reuse single installed Cocos-Gizmos runtime');
console.log('PASS: Grid Gizmos options, shared geometry, cell spans, hexagons, bounded labels, Inspector.');
