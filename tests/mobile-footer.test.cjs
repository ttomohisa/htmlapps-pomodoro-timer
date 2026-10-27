'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
test('phone informational footer and equivalent local label',()=>{assert.ok(html.includes('@media (max-width: 620px) { body > footer { display: none; } }'));assert.ok(html.includes("local:'Fully local processing'"));});
test('build metadata stays final after localized Help content',()=>{const h=html.match(/<dialog id="helpDialog"[^]*?<\/dialog>/)[0];assert.match(h,/<div id="helpContent"><\/div><p class="build-line help-build"><span id="footerBuild">Build -<\/span><span id="footerDeps">Dependencies 0<\/span><\/p><\/div><\/dialog>$/);for(const id of ['footerBuild','footerDeps'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);assert.ok(html.includes("+t.help"));});

test("Help body flexes within the existing clipped dialog",()=>{for(const rule of ["#helpDialog[open]{display:flex;flex-direction:column}","#helpDialog .dialog-header{flex:none}","#helpDialog .dialog-body{min-height:0;flex:1 1 auto}"])assert.ok(html.includes(rule));});
