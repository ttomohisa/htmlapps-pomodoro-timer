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
  assert.match(styles[0],/\.side-stack>\.card\{border:0;border-radius:0;background:transparent/);
  assert.match(styles[0],/\.side-stack>\.card:not\(:first-child\)\{border-top:1px solid var\(--line\)\}/);
  assert.match(styles[0],/\.history-card\{[^}]*border:0;border-radius:0;background:transparent/);
  assert.match(styles[0],/\.history-filters \.small-btn\[aria-pressed="true"\]\{background:transparent/);
  assert.match(styles[0],/\.pip-button\{[^}]*border:1px solid color-mix\(in srgb,var\(--accent\) 32%,var\(--line\)\)[^}]*border-radius:8px;background:var\(--accent-soft\);color:var\(--accent\)/);
  assert.match(styles[0],/\.pip-button svg\{color:var\(--accent\)\}/);
  assert.doesNotMatch(html, /class="btn primary pip-button/);
  assert.doesNotMatch(html, /class="pip-icon"/);
  assert.match(html, /<div class="panel-head"><h2 class="panel-title" id="pipTitle">Picture in Picture<\/h2><\/div>/);
  assert.match(html, /<button class="btn pip-button icon-text" id="pipButton" type="button"><svg[^>]*aria-hidden="true"/);
  assert.match(html, /<rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor"\/>/);
  assert.match(html, /<footer><div class="build-line"><span id="footerName">Pomodoro Timer<\/span><span>MIT License<\/span><span id="footerPrivacy">/);
  assert.doesNotMatch(html, /<\/span> · MIT License · /);
  assert.match(styles[0],/\.build-line>span:not\(:last-child\)::after\{content:"·";margin:0 8px\}/);
});
test('export actions start folded, and explain the scope of CSV versus JSON',()=>{
  assert.match(html, /<details class="history-export" id="historyExport"><summary>/);
  assert.doesNotMatch(html, /<details class="history-export" id="historyExport" open/);
  assert.match(html, /id="historyExportSummary">データを書き出す/);
  assert.match(html, /id="exportCsvButton" type="button">表示中の履歴をCSVで保存/);
  assert.match(html, /id="exportButton" type="button">設定・タイマー・全履歴をJSONで保存/);
  assert.match(html, /historyExportSummary:'Export data',exportCsv:'Save visible history as CSV'/);
  assert.match(html, /export:'Save settings, timer & all history as JSON'/);
  assert.match(html, /\$\('historyExportSummary'\)\.textContent=t\.historyExportSummary/);
  assert.match(styles[0], /\.history-export-menu\{position:absolute;z-index:12/);
  assert.match(styles[0],/@media\(max-width:620px\)\{\.section-head\{[^}]*\}\.history-export-menu\{left:0;right:auto\}/);
  assert.match(html, /<button class="small-btn danger" id="clearHistoryButton"/);
  assert.match(html, /function exportHistoryCsv\(\)\{const rows=filteredHistory\(\)/);
  assert.match(html, /function exportData\(\)\{const payload=\{schemaVersion:1,exportedAt:new Date\(\)\.toISOString\(\),app:\{name:APP_CONFIG\.name,version:APP_CONFIG\.version\},data:state\}/);
});
test('export closes when clicked outside, stays open for inside clicks, and Escape works',()=>{
  assert.match(html, /document\.addEventListener\('click',\(e\)=>\{const exportMenu=\$\('historyExport'\);if\(exportMenu\.open&&!exportMenu\.contains\(e\.target\)\)exportMenu\.open=false;\}\)/);
  assert.match(html, /document\.addEventListener\('keydown',\(e\)=>\{if\(e\.key!=='Escape'\|\|!\$\('historyExport'\)\.open\)return;/);
  assert.match(html, /tag==='summary'\|\|e\.target\?\.closest\?\.\('#historyExport'\)/);
});
test('the main action has a fill; secondary actions and PiP controls have no boxes',()=>{
  assert.match(styles[0],/\.btn\{[^}]*border:1px solid transparent[^}]*background:transparent/);
  assert.match(styles[0],/\.btn\.primary\{[^}]*background:var\(--accent\)/);
  assert.match(styles[0],/\.small-btn\{[^}]*border:1px solid transparent/);
  assert.match(styles[0],/\.distraction-btn\{[^}]*background:transparent/);
  assert.match(styles[1],/button\{[^}]*border:0[^}]*background:transparent/);
});
test('fixed mobile controls, notification and dialogs follow the same outer spacing',()=>{
  const css=styles[0];
  assert.match(css,/\.mobile-dock\{[^}]*left:0;right:0;bottom:0/);
  assert.match(css,/\.mobile-dock\{[^}]*border-top:1px solid var\(--line\)[^}]*border-radius:0/);
  assert.match(css,/\.toast\{[^}]*right:16px;bottom:16px/);
  assert.match(css,/\.toast\{left:16px;right:16px;bottom:calc\(80px/);
  assert.match(css,/dialog\{width:min\(650px,calc\(100% - 32px\)\)/);
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
