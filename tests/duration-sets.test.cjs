const test = require('node:test');
const assert = require('node:assert/strict');
const { makeApp } = require('./app-harness.cjs');
const minute = 60000;
const clone = value => JSON.parse(JSON.stringify(value));
const setA = {focus:40,short:8,long:20};
const setB = {focus:20,short:4,long:10};
const setC = {focus:50,short:10,long:30};
function draft(a, values = setA) {
  for (const [key,id] of [['focus','focusMinutesInput'],['short','shortMinutesInput'],['long','longMinutesInput']]) a.el(id).value = String(values[key]);
}
function open(a) { a.click('settingsButton'); }
function add(a, values = setA) { draft(a,values); a.click('durationSetSave'); }
function buttons(a, action) { return a.el('durationSetList').querySelectorAll(`.duration-set-${action}`); }
function seedWith(...presets) { const seed=makeApp().persisted();seed.presets=presets;return seed; }

test('save duration set stores only a valid triple, leaves timer/settings/draft alone and reloads', () => {
  const a=makeApp();open(a);draft(a);a.el('autoBreakToggle').checked=true;
  const before={timer:clone(a.api.state.timer),settings:clone(a.api.state.settings)};
  a.click('durationSetSave');assert.deepEqual(clone(a.api.state.presets),[setA]);
  assert.deepEqual(a.persisted().presets,[setA]);assert.deepEqual(clone(a.api.state.timer),before.timer);
  assert.deepEqual(clone(a.api.state.settings),before.settings);assert.equal(a.el('autoBreakToggle').checked,true);
  assert.equal(a.el('settingsDialog').open,true);assert.equal(a.el('focusMinutesInput').value,'40');
  assert.deepEqual(clone(a.reload().api.state.presets),[setA]);
});

test('apply fills only duration drafts; Cancel/close/native dismissal never commit settings', () => {
  for(const dismiss of ['settingsCancel','settingsClose','native']){
    const a=makeApp({saved:seedWith(setA)});open(a);a.el('autoBreakToggle').checked=true;
    const before=clone(a.api.state);buttons(a,'apply')[0].click();
    assert.equal(Number(a.el('focusMinutesInput').value),40);assert.equal(Number(a.el('shortMinutesInput').value),8);assert.equal(Number(a.el('longMinutesInput').value),20);
    assert.equal(a.el('autoBreakToggle').checked,true);assert.deepEqual(clone(a.api.state),before);
    if(dismiss==='native') a.el('settingsDialog').close();else a.click(dismiss);
    assert.deepEqual(clone(a.api.state),before);open(a);assert.equal(Number(a.el('focusMinutesInput').value),25);
  }
});

test('existing Save commits applied durations and updates an untouched idle phase without starting', () => {
  for(const mode of ['focus','short','long']) {
    const seed=seedWith(setA);Object.assign(seed.timer,{mode,plannedMs:seed.settings[mode]*minute,remainingMs:seed.settings[mode]*minute});
    const a=makeApp({saved:seed});open(a);buttons(a,'apply')[0].click();a.click('settingsSave');
    assert.equal(a.api.state.settings.focus,40);assert.equal(a.api.state.settings.short,8);assert.equal(a.api.state.settings.long,20);
    assert.equal(a.api.state.timer.plannedMs,setA[mode]*minute);assert.equal(a.api.state.timer.remainingMs,setA[mode]*minute);
    assert.equal(a.api.state.timer.running,false);assert.equal(a.el('settingsDialog').open,false);
  }
});

test('add/apply/remove/undo/save preserve exact running, paused, Flow and extended timer state', () => {
  for(const phase of ['running','paused','flow','paused-flow','extended','break-running','break-paused']) {
    const a=makeApp({saved:seedWith(setA)});a.input('intentionInput','Keep current task');a.click('mainToggleButton');a.advance(minute);a.tick();
    if(phase.startsWith('break')){a.click('finishButton');a.click('mainToggleButton');a.advance(10000);}
    if(phase.includes('flow')){a.advance(26*minute);a.tick();}
    if(phase==='extended')a.click('addFiveButton');
    if(phase.includes('paused'))a.click('mainToggleButton');
    const before=clone(a.api.state.timer);const history=clone(a.api.state.history);open(a);
    add(a,setB);assert.deepEqual(clone(a.api.state.timer),before,phase);
    buttons(a,'apply')[0].click();buttons(a,'remove')[1].click();a.click('durationSetUndo');a.click('settingsSave');
    assert.deepEqual(clone(a.api.state.timer),before,phase);assert.deepEqual(clone(a.api.state.history),history,phase);
  }
});

test('duplicate duration triples do not consume capacity and full lists ask to remove first', () => {
  const a=makeApp();open(a);for(const preset of [setA,setB,setC])add(a,preset);
  add(a,setA);assert.equal(a.api.state.presets.length,3);assert.match(a.el('durationSetStatus').textContent,/already/i);
  add(a,{focus:60,short:12,long:30});assert.deepEqual(clone(a.api.state.presets),[setA,setB,setC]);assert.match(a.el('durationSetStatus').textContent,/remove/i);
});

test('all duration boundaries and invalid drafts are checked before saving either settings or sets', () => {
  for(const invalid of [{focus:''},{focus:' '},{focus:'1.5'},{focus:0},{focus:181},{short:61},{long:121},{short:NaN},{long:Infinity}]){
    const a=makeApp();open(a);draft(a,{...setA,...invalid});const before=clone(a.api.state);
    a.click('durationSetSave');assert.deepEqual(clone(a.api.state),before);assert.match(a.el('durationSetStatus').textContent,/whole|range/i);
    a.click('settingsSave');assert.deepEqual(clone(a.api.state),before);assert.equal(a.el('settingsDialog').open,true);
  }
  const a=makeApp();open(a);add(a,{focus:1,short:1,long:1});add(a,{focus:180,short:60,long:120});assert.equal(a.api.state.presets.length,2);
});

test('legacy and malformed preset storage loads safely with numeric ranges, deduplication and a cap', () => {
  const legacy=makeApp().persisted();delete legacy.presets;assert.deepEqual(clone(makeApp({saved:legacy}).api.state.presets),[]);
  for(const presets of [null,'bad',{},[null,[],{},'x',{focus:'40',short:8,long:20},{focus:40,short:0,long:20},{focus:1.1,short:1,long:1}]]){
    const seed=makeApp().persisted();seed.presets=presets;assert.deepEqual(clone(makeApp({saved:seed}).api.state.presets),[]);
  }
  const a=makeApp({saved:seedWith({...setA,flow:false,name:'ignore',notify:true},setA,setB,setC,{focus:60,short:10,long:30})});
  assert.deepEqual(clone(a.api.state.presets),[setA,setB,setC]);assert.deepEqual(a.persisted().presets,[setA,setB,setC]);
});

test('remove and Undo are presets-only, preserve order, never restore old timer/settings/history', () => {
  const a=makeApp({saved:seedWith(setA,setB,setC)});open(a);buttons(a,'remove')[1].click();assert.deepEqual(clone(a.api.state.presets),[setA,setC]);
  a.click('settingsCancel');a.click('mainToggleButton');a.advance(minute);a.click('finishButton');
  open(a);draft(a,{focus:60,short:12,long:30});a.click('settingsSave');const before=clone(a.api.state);
  open(a);a.click('durationSetUndo');assert.deepEqual(clone(a.api.state.presets),[setA,setB,setC]);
  for(const key of ['timer','settings','history'])assert.deepEqual(clone(a.api.state[key]),before[key]);
  a.click('durationSetUndo');assert.equal(a.api.state.presets.length,3);
});

test('Undo cannot exceed capacity and retains the pending removal when full', () => {
  const a=makeApp({saved:seedWith(setA,setB,setC)});open(a);buttons(a,'remove')[0].click();add(a,{focus:60,short:12,long:30});
  a.click('durationSetUndo');assert.equal(a.api.state.presets.length,3);assert.match(a.el('durationSetStatus').textContent,/remove/i);
  assert.equal(a.el('durationSetUndo').hidden,false);
});

test('Undo does not duplicate an explicitly re-saved removed triple', () => {
  const a=makeApp({saved:seedWith(setA)});open(a);buttons(a,'remove')[0].click();add(a,setA);a.click('durationSetUndo');
  assert.deepEqual(clone(a.api.state.presets),[setA]);assert.equal(a.el('durationSetUndo').hidden,true);
});

test('failed preset add/remove/Undo preserve the previous list and allow the same operation to retry', () => {
  const a=makeApp({saved:seedWith(setA)});open(a);const stored=a.persisted();a.setStorageFailure(true);add(a,setB);
  assert.deepEqual(clone(a.api.state.presets),[setA]);assert.deepEqual(a.persisted(),stored);assert.match(a.el('durationSetStatus').textContent,/could not|unable|failed/i);
  a.setStorageFailure(false);a.click('durationSetSave');assert.deepEqual(clone(a.api.state.presets),[setA,setB]);
  a.setStorageFailure(true);buttons(a,'remove')[0].click();assert.deepEqual(clone(a.api.state.presets),[setA,setB]);
  a.setStorageFailure(false);buttons(a,'remove')[0].click();assert.deepEqual(clone(a.api.state.presets),[setB]);
  a.setStorageFailure(true);a.click('durationSetUndo');assert.deepEqual(clone(a.api.state.presets),[setB]);assert.equal(a.el('durationSetUndo').hidden,false);
  a.setStorageFailure(false);a.click('durationSetUndo');assert.deepEqual(clone(a.api.state.presets),[setA,setB]);
});

test('storage failure on Settings Save is truthful and runtime settings remain usable without timer rollback', () => {
  for(const locale of ['en','ja'])for(const phase of ['idle','running','paused']){
    const a=makeApp({locale});if(phase!=='idle'){a.click('mainToggleButton');a.advance(minute);if(phase==='paused')a.click('mainToggleButton');}
    const before=clone(a.api.state.timer);const stored=a.persisted();a.setStorageFailure(true);open(a);draft(a);a.click('settingsSave');
    assert.equal(a.api.state.settings.focus,40);assert.deepEqual(a.persisted(),stored);
    assert.match(a.el('toastMessage').textContent,locale==='en'?/session only/i:/今回.*のみ/);
    if(phase!=='idle')assert.deepEqual(clone(a.api.state.timer),before);
    else assert.equal(a.api.state.timer.plannedMs,40*minute);
    a.setStorageFailure(false);open(a);a.click('settingsSave');assert.equal(a.persisted().settings.focus,40);
  }
});

test('custom-duration session and Flow copy contains no hard-coded 25 in Japanese or English', () => {
  for(const locale of ['ja','en']){
    const a=makeApp({locale});open(a);draft(a);a.click('settingsSave');
    for(const id of ['introTitle','intentionLabel','flowDesc','helpBody'])assert.doesNotMatch(a.el(id).textContent,/25/);
    a.click('mainToggleButton');a.advance(40*minute);a.tick();assert.equal(a.api.state.timer.flowOvertime,true);assert.doesNotMatch(a.el('toastMessage').textContent,/25/);
  }
});

test('reset confirmation cancellation preserves old phase, real reset adopts saved duration', async () => {
  const a=makeApp({saved:seedWith(setA)});a.click('mainToggleButton');a.advance(minute);open(a);buttons(a,'apply')[0].click();a.click('settingsSave');
  const before=clone(a.api.state.timer);let pending=a.click('resetTimerButton');a.click('confirmCancel');await pending;assert.deepEqual(clone(a.api.state.timer),before);
  pending=a.click('resetTimerButton');a.click('confirmOk');await pending;assert.equal(a.api.state.timer.plannedMs,40*minute);assert.equal(a.api.state.timer.running,false);assert.equal(a.api.state.history.length,0);
});

test('localized explicit values and action labels identify every set; Settings suppresses shortcuts', () => {
  for(const locale of ['ja','en']){
    const seed=seedWith(setA);seed.lang=locale;const a=makeApp({locale,saved:seed});open(a);
    assert.equal(a.el('durationSetsTitle').textContent,locale==='ja'?'時間セット':'Duration sets');
    const list=a.el('durationSetList').textContent;for(const value of ['40','8','20'])assert.ok(list.includes(value));
    for(const action of ['apply','remove'])assert.match(buttons(a,action)[0].attributes['aria-label'],/40/);
    const before=clone(a.api.state.timer);a.key(' ');a.key('n');a.key('d');assert.deepEqual(clone(a.api.state.timer),before);
    buttons(a,'remove')[0].click();assert.equal(a.document.activeElement,a.el('durationSetSave'));assert.equal(a.el('durationSetUndo').hidden,false);
  }
});

test('unstarted +5 extensions survive repeated settings commits, reload and equal-duration collisions until reset', async () => {
  for(const mode of ['focus','short','long']) {
    const seed=makeApp().persisted();Object.assign(seed.timer,{mode,plannedMs:seed.settings[mode]*minute,remainingMs:seed.settings[mode]*minute});
    let a=makeApp({saved:seed});a.click('addFiveButton');const extended=clone(a.api.state.timer);
    const collision={focus:30,short:10,long:20};open(a);draft(a,collision);a.click('settingsSave');assert.deepEqual(clone(a.api.state.timer),extended,mode);
    a=a.reload();const reloaded=clone(a.api.state.timer);open(a);draft(a,setA);a.click('settingsSave');assert.deepEqual(clone(a.api.state.timer),reloaded,mode);
    await a.click('resetTimerButton');assert.equal(a.api.state.timer.plannedMs,setA[mode]*minute);assert.equal(a.api.state.timer.running,false);
    open(a);draft(a,setB);a.click('settingsSave');assert.equal(a.api.state.timer.plannedMs,setB[mode]*minute);
  }
});

test('legacy idle extensions without a marker are preserved on settings Save', () => {
  const seed=makeApp().persisted();delete seed.timer.durationAdjusted;seed.timer.plannedMs=30*minute;seed.timer.remainingMs=30*minute;
  const a=makeApp({saved:seed});const before=clone(a.api.state.timer);open(a);draft(a);a.click('settingsSave');assert.deepEqual(clone(a.api.state.timer),before);
});

test('settings markup keeps feedback and Undo inside the modal and constrains its scroll body', () => {
  const fs=require('node:fs'),path=require('node:path');let raw=fs.readFileSync(path.resolve(__dirname,'..',process.env.POMODORO_TEST_HTML||'src/index.template.html'),'utf8');
  const payload=raw.match(/<script id="payload" type="application\/octet-stream">([^<]+)<\/script>/);if(payload)raw=require('node:zlib').gunzipSync(Buffer.from(payload[1].trim(),'base64')).toString('utf8');
  const modal=raw.match(/<dialog id="settingsDialog">([\s\S]*?)<\/dialog>/)[1];assert.match(modal,/id="durationSetUndo"/);assert.match(modal,/id="durationSetStatus"[^>]*role="status"/);
  assert.match(raw,/#settingsDialog\[open\]\{[^}]*display:flex[^}]*flex-direction:column/);assert.match(raw,/#settingsDialog \.dialog-body\{[^}]*min-height:0[^}]*flex:1 1 auto/);
});
