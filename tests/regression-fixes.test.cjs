const {test} = require('node:test');
const assert = require('node:assert/strict');
const {makeApp} = require('./app-harness.cjs');
const minute = 60000;

test('the Start gesture unlocks sound, and finishing just after Flow expiry chimes once', () => {
  const a=makeApp();a.api.state.settings.sound=true;
  assert.equal(a.audio.contexts,0);
  a.click('mainToggleButton');
  assert.equal(a.audio.contexts,1);
  assert.equal(a.audio.resumes,1);
  a.advance(25*minute+2000);
  a.click('finishButton');
  assert.equal(a.audio.starts,2);
  assert.equal(a.api.state.history.length,1);
  assert.equal(a.api.state.history[0].durationMs,25*minute+2000);
  assert.equal(a.api.state.history[0].overtimeMs,2000);
  assert.equal(a.api.state.timer.mode,'short');
});

test('ordinary Flow expiry chimes once before overtime starts', () => {
  const a=makeApp();a.api.state.settings.sound=true;
  a.click('mainToggleButton');a.advance(25*minute+1000);a.tick();
  assert.equal(a.audio.starts,2);
  assert.equal(a.api.state.timer.flowOvertime,true);
});

test('an untouched focus cannot record distractions, but running and paused sessions can', () => {
  const a=makeApp();
  assert.equal(a.el('distractionButton').disabled,true);
  a.key('d');a.click('distractionButton');
  assert.equal(a.api.state.timer.distractions,0);
  a.click('mainToggleButton');
  assert.equal(a.el('distractionButton').disabled,false);
  a.key('d');assert.equal(a.api.state.timer.distractions,1);
  a.click('mainToggleButton');
  a.key('d');assert.equal(a.api.state.timer.distractions,2);
});

test('malformed saved history is discarded without preventing a valid entry from loading', () => {
  const seed=makeApp().persisted();
  seed.history=[null,false,{},[],{endedAt:'invalid',durationMs:minute},{id:'valid',endedAt:Date.parse('2026-10-04T11:30:00Z'),durationMs:minute,intention:'Good record',distractions:2}];
  const a=makeApp({saved:seed});
  assert.equal(a.api.state.history.length,1);
  assert.equal(a.api.state.history[0].id,'valid');
  assert.equal(a.el('historyList').children.length,1);
  assert.equal(a.el('todaySessions').textContent,'1');
  assert.equal(a.el('todayDistractions').textContent,'2');
});

test('sub-minute sessions show seconds, not a misleading full minute', () => {
  for(const [locale,suffix] of [['en',' sec'],['ja','秒']]){
    const a=makeApp({locale});
    a.click('mainToggleButton');a.advance(20*1000);a.click('finishButton');
    const label=a.el('historyList').children[0].children[2].children[0].textContent;
    assert.equal(label,'20'+suffix);
    assert.equal(a.el('todayMinutes').textContent,'0');
  }
});

test('a history write failure does not display a success message', () => {
  for(const locale of ['en','ja']){
    const a=makeApp({locale});
    a.click('mainToggleButton');a.advance(minute);
    const persisted=a.persisted();a.setStorageFailure(true);
    a.click('finishButton');
    assert.equal(a.api.state.history.length,1);
    assert.deepEqual(a.persisted(),persisted);
    assert.match(a.el('toastMessage').textContent,locale==='en'?/Could not save/:/保存できませんでした/);
  }
});

test('mobile timer controls have localized accessible names in both languages', () => {
  for(const [locale,dock,add] of [['ja','タイマー操作','5分追加'],['en','Timer controls','Add 5 min']]){
    const a=makeApp({locale});
    assert.equal(a.el('mobileDock').attributes['aria-label'],dock);
    assert.equal(a.el('mobileAddButton').attributes['aria-label'],add);
  }
});

test('failed writes after add-five and reuse never show a success toast', () => {
  const a=makeApp();a.setStorageFailure(true);a.click('addFiveButton');
  assert.match(a.el('toastMessage').textContent,/Could not save/);
  const seed=makeApp().persisted();
  seed.history=[{id:'reusable',endedAt:Date.parse('2026-10-04T11:30:00Z'),durationMs:minute,intention:'Reuse task'}];
  const b=makeApp({saved:seed});
  b.setStorageFailure(true);
  b.el('historyList').querySelectorAll('.history-reuse')[0].click();
  assert.equal(b.el('intentionInput').value,'Reuse task');
  assert.match(b.el('toastMessage').textContent,/Could not save/);
});

test('failed history deletion preserves both the displayed and persisted sessions', async () => {
  const seed=makeApp().persisted();
  seed.history=[{id:'kept',startedAt:Date.parse('2026-10-04T10:59:00Z'),endedAt:Date.parse('2026-10-04T11:00:00Z'),durationMs:60000,plannedMs:25*60000,overtimeMs:0,round:1,intention:'Keep me',distractions:0}];
  const a=makeApp({saved:seed});
  const snapshot=JSON.stringify(a.api.state.history);
  a.setStorageFailure(true);
  const pending=a.click('clearHistoryButton');
  a.click('confirmOk');
  await pending;
  assert.equal(JSON.stringify(a.api.state.history),snapshot);
  assert.equal(JSON.stringify(a.persisted().history),snapshot);
  assert.equal(a.el('historyList').children.length,1);
  assert.match(a.el('toastMessage').textContent,/save|stored|could not/i);
});
