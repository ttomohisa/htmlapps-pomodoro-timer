'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {makeApp}=require('./app-harness.cjs');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const css=html.match(/<style>([\s\S]*?)<\/style>/)?.[1];

test('the redundant hero title is removed and both languages explain actual app functions',()=>{
  assert.doesNotMatch(html,/id="introTitle"/);
  assert.doesNotMatch(html,/introTitle:/);
  assert.doesNotMatch(html,/作業中も、画面の隅に。/);
  assert.match(html,/<p id="introText">/);
  const ja=makeApp({locale:'ja'});
  assert.match(ja.el('introText').textContent,/集中・休憩.*脱線回数/);
  assert.match(ja.el('introText').textContent,/対応ブラウザ.*小窓/);
  assert.match(ja.el('brandMeta').textContent,/PiP/);
  const en=makeApp({locale:'en'});
  assert.match(en.el('introText').textContent,/focus time, breaks, and distractions/i);
  assert.match(en.el('introText').textContent,/supported browsers/i);
  assert.match(en.el('brandMeta').textContent,/Picture-in-Picture/);
});

test('cards are quiet surfaces without gradient fills or decorative shadows',()=>{
  assert.ok(css);
  assert.match(css,/\.card\{[^}]*box-shadow:none\}/);
  assert.match(css,/\.timer-card::before\{display:none\}/);
  assert.match(css,/\.pip-card\{[^}]*background:var\(--surface\)\}/);
  assert.doesNotMatch(css,/\.pip-card\{[^}]*linear-gradient/);
  assert.match(html,/<button class="btn pip-button icon-text" id="pipButton"/);
});

test('CSS spacing follows an 8px grid, excluding visually hidden accessibility spacing',()=>{
  assert.ok(css);
  const pipCss=html.match(/d\.head\.innerHTML=`[^]*?<style>([^]*?)<\/style>`;/)?.[1];
  assert.ok(pipCss,'Document PiP stylesheet must be embedded');
  for(const [name,style] of [['main',css],['Document PiP',pipCss]]){
    const props=[...style.matchAll(/(?<![\w-])(padding(?:-(?:top|bottom|left|right))?|margin(?:-(?:top|bottom|left|right))?|gap|row-gap|column-gap)\s*:\s*([^;}]+)/g)];
    assert.ok(props.length>=(name==='main'?10:5),name+': spacing declarations missing');
    for(const m of props)for(const token of m[2].matchAll(/(-?\d+(?:\.\d+)?)px/g)){
      const value=Number(token[1]);
      if(name==='main'&&m[1]==='margin'&&m[2].trim()==='-1px')continue;
      assert.equal(value%8,0,`${name}: ${m[1]}:${m[2]} is not on the 8px grid`);
    }
  }
});

test('release workflow validates before tagging, only on main, and avoids duplicate tags',()=>{
  const release=fs.readFileSync(path.join(root,'.github/workflows/publish-release.yml'),'utf8');
  assert.match(release,/push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(release,/scripts\/check-repository\.ps1/);
  assert.match(release,/git ls-remote origin refs\/heads\/main/);
  assert.match(release,/git tag --list \$tag/);
  assert.match(release,/gh release view \$tag/);
  assert.match(release,/gh release create \$tag/);
  assert.match(release,/--verify-tag/);
  assert.match(release,/pomodoro-timer\.html#pomodoro-timer\.html/);
  assert.match(release,/dist\/index\.self-extract\.html#/);
});
