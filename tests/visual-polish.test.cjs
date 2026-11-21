'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
let html=read(process.env.POMODORO_TEST_HTML||'src/index.template.html');
const payload=html.match(/<script id="payload" type="application\/octet-stream">([^<]+)<\/script>/);
if(payload)html=zlib.gunzipSync(Buffer.from(payload[1].trim(),'base64')).toString('utf8');
const styles=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]);
test('hero contains no redundant title and uses factual, bilingual feature descriptions',()=>{
  assert.doesNotMatch(html,/id="introTitle"|t\.introTitle|作業中も、画面の隅に。/);
  assert.match(html,/<p id="introText">/);
  assert.match(html,/tagline:'集中・休憩を計測。PiPで小窓表示も。'/);
  assert.match(html,/tagline:'Focus and break timer with optional PiP.'/);
});
test('every CSS margin, padding and gap uses multiples of 8px',()=>{
  assert.equal(styles.length,2,'main layout and interactive PiP are both covered');
  let checked=0;
  for(const css of styles)for(const m of css.matchAll(/(?:^|[;{])\s*(margin(?:-(?:top|right|bottom|left))?|padding(?:-(?:top|right|bottom|left))?|(?:column-|row-)?gap)\s*:\s*([^;}]+)/g)){
    for(const n of m[2].matchAll(/(-?\d+(?:\.\d+)?)px/g)){
      // -1px offsets are used only for screen-reader-only content, not visual spacing.
      if(Number(n[1])===-1)continue;
      assert.equal(Number(n[1])%8,0,`${m[1]}: ${m[2]}`);
      checked++;
    }
  }
  assert.ok(checked>80,`Expected complete CSS spacing coverage, got ${checked}`);
});
test('cards are flat and subdued, without the timer stripe or PiP gradient',()=>{
  assert.match(styles[0],/\.card\{[^}]*box-shadow:none/);
  assert.doesNotMatch(styles[0],/\.timer-card::before/);
  assert.doesNotMatch(styles[0],/\.pip-card\{[^}]*linear-gradient/);
  assert.match(styles[0],/\.metric:last-child\{border-right:0\}/);
});
test('fixed mobile controls, notification and dialogs follow the same outer spacing',()=>{
  const css=styles[0];
  assert.match(css,/\\.mobile-dock\\{[^}]*left:16px;right:16px;bottom:max\\(16px,/);
  assert.match(css,/\\.toast\\{[^}]*right:16px;bottom:16px/);
  assert.match(css,/\\.toast\\{left:16px;right:16px;bottom:calc\\(96px/);
  assert.match(css,/dialog\\{width:min\\(650px,calc\\(100% - 32px\\)\\)/);
});
test('merge-triggered release validates artifacts and safely skips published versions',()=>{
  const workflow=read('.github/workflows/release.yml');
  assert.match(workflow,/push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.doesNotMatch(workflow,/pull_request:/);
  assert.match(workflow,/needs: validate/);
  assert.match(workflow,/scripts\/check-repository\.ps1/);
  assert.match(workflow,/gh release view/);
  assert.match(workflow,/gh release create/);
  assert.match(workflow,/--target "\$GITHUB_SHA"/);
  assert.match(workflow,/pomodoro-timer-self-extract\.html/);
  assert.match(workflow,/cp release-html\/dist\/index\.html release-html\/pomodoro-timer\.html/);
  assert.equal(JSON.parse(read('app.config.json')).version,'1.0.5');
});
