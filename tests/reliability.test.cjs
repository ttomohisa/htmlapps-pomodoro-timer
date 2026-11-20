const test = require('node:test');
const assert = require('node:assert/strict');
const {makeApp} = require('./app-harness.cjs');
const minute = 60000;

test('starting with sound enabled primes audio during the user gesture and plays a single completion chime', () => {
  const a=makeApp();
  a.api.state.settings.sound=true;
  a.click('mainToggleButton');
  assert.equal(a.audio.created,1);
  assert.equal(a.audio.resumes,1);
  a.advance(25*minute+1000);
  a.tick();
  assert.equal(a.api.state.timer.flowOvertime,true);
  assert.equal(a.audio.starts,2);
});

test('finishing just after the focus deadline does not double-chime or double-notify', () => {
  const a=makeApp();
  a.api.state.settings.sound=true;
  a.api.state.settings.notify=true;
  a.click('mainToggleButton');
  a.advance(25*minute+2000);
  a.click('finishButton');
  assert.equal(a.audio.starts,2);
  assert.equal(a.notifications.length,1);
  assert.equal(a.api.state.timer.mode,'short');
  assert.equal(a.api.state.history.length,1);
  assert.equal(a.api.state.history[0].durationMs,25*minute+2000);
});

test('extending a just-expired focus session does not announce a Flow transition that is immediately canceled', () => {
  const a=makeApp();
  a.api.state.settings.sound=true;
  a.api.state.settings.notify=true;
  a.click('mainToggleButton');
  a.advance(25*minute+2000);
  a.click('addFiveButton');
  assert.equal(a.audio.starts,0);
  assert.equal(a.notifications.length,0);
  assert.equal(a.api.currentElapsed(),25*minute+2000);
  assert.equal(a.api.state.timer.running,true);
  assert.equal(a.api.state.timer.flowOvertime,false);
});

test('distractions are disabled before the first start, but allowed while running or paused', () => {
  const a=makeApp();
  assert.equal(a.el('distractionButton').disabled,true);
  a.click('distractionButton');
  a.key('d');
  assert.equal(a.api.state.timer.distractions,0);
  a.click('mainToggleButton');
  assert.equal(a.el('distractionButton').disabled,false);
  a.click('distractionButton');
  assert.equal(a.api.state.timer.distractions,1);
  a.click('mainToggleButton');
  a.click('distractionButton');
  assert.equal(a.api.state.timer.distractions,2);
});

test('malformed saved history rows are discarded while valid history remains usable', () => {
  const seed=makeApp().persisted();
  const endedAt=Date.parse('2026-10-04T11:00:00Z');
  seed.history=[null,{},'oops',{id:'bad-date',endedAt:'broken',durationMs:20000},
    {id:'valid',endedAt,durationMs:20000,intention:'Recover this item',distractions:1},
    {id:'negative',endedAt,durationMs:-1},{id:'bad-duration',endedAt,durationMs:'oops'}];
  const a=makeApp({saved:seed});
  assert.equal(a.api.state.history.length,1);
  assert.equal(a.api.state.history[0].id,'valid');
  assert.equal(a.api.state.history[0].durationMs,20000);
  assert.equal(a.el('historyList').children.length,1);
  assert.equal(a.el('historyList').children[0].children[1].children[0].textContent,'Recover this item');
});

test('sub-minute focus sessions show seconds in the history and daily total in both languages', () => {
  for(const locale of ['ja','en']){
    const a=makeApp({locale});
    a.click('mainToggleButton');
    a.advance(20*1000);
    a.click('finishButton');
    const duration=a.el('historyList').children[0].children[2].children[0].textContent;
    assert.equal(duration,locale==='ja'?'20 秒':'20 sec');
    assert.equal(a.el('todayMinutes').textContent,locale==='ja'?'20秒':'20sec');
    assert.equal(a.el('todayMinutesLabel').textContent,locale==='ja'?'集中時間':'focus time');
  }
});

test('important operations show a storage warning rather than claiming to be saved', async () => {
  const a=makeApp();
  a.setStorageFailure(true);
  a.click('mainToggleButton');
  assert.match(a.el('toastMessage').textContent,/could not save/i);
  a.advance(2000);
  a.click('finishButton');
  assert.match(a.el('toastMessage').textContent,/could not save/i);
  assert.equal(a.api.state.history.length,1);
  a.click('mainToggleButton');
  assert.match(a.el('toastMessage').textContent,/could not save/i);
  const pending=a.click('clearHistoryButton');
  a.click('confirmOk');
  await pending;
  assert.equal(a.api.state.history.length,0);
  assert.match(a.el('toastMessage').textContent,/could not save/i);
  a.setStorageFailure(false);
  a.click('mainToggleButton');
  assert.doesNotMatch(a.el('toastMessage').textContent,/could not save/i);
});

test('a rejected Document PiP request falls back to display-only Video PiP', async () => {
  const a=makeApp({documentPipFails:true,videoPip:true});
  await a.click('pipButton');
  assert.equal(a.api.pipKind,'video');
  assert.ok(a.el('pipVideo').srcObject);
  assert.equal(a.document.pictureInPictureElement,a.el('pipVideo'));
  assert.match(a.el('toastMessage').textContent,/display-only/i);
});

test('timer ticks preserve existing round-dot DOM nodes and language switch updates mobile accessibility', () => {
  const a=makeApp({locale:'ja'});
  const dots=[...a.el('rounds').children];
  a.tick();
  for(let i=0;i<dots.length;i++)assert.strictEqual(a.el('rounds').children[i],dots[i]);
  assert.equal(a.el('mobileAddButton').attributes['aria-label'],'5分追加');
  assert.equal(a.el('mobileDock').attributes['aria-label'],'タイマー操作');
  a.click('languageButton');
  assert.equal(a.el('mobileAddButton').attributes['aria-label'],'Add 5 min');
  assert.equal(a.el('mobileDock').attributes['aria-label'],'Timer controls');
});
