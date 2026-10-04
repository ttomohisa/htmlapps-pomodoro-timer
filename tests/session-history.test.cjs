const {test} = require('node:test');
const assert = require('node:assert/strict');
const {makeApp} = require('./app-harness.cjs');
const minute = 60000;
function finish(a, intention = 'Read 日本語') {a.input('intentionInput', intention);a.click('mainToggleButton');a.advance(minute);a.click('finishButton');}
function nextFocus(a) {a.click('finishButton');}

test('running Flow extensions preserve every elapsed minute through repeats and reload', () => {
  let a = makeApp(); a.click('mainToggleButton'); a.advance(27 * minute); a.tick();
  a.click('addFiveButton'); assert.equal(a.api.currentElapsed(), 27 * minute);
  a = a.reload(); assert.equal(a.api.currentElapsed(), 27 * minute);
  a.advance(7 * minute); a.tick(); assert.equal(a.api.currentElapsed(), 34 * minute);
  a.click('addFiveButton'); a.advance(5 * minute); a.click('finishButton');
  assert.equal(a.api.state.history[0].durationMs, 39 * minute);
  assert.equal(a.api.state.history[0].overtimeMs, 4 * minute);
});
test('paused Flow extension survives reload and excludes paused wall time', () => {
  let a = makeApp();a.click('mainToggleButton');a.advance(27 * minute);a.tick();a.click('mainToggleButton');
  a.advance(10 * minute);a.click('addFiveButton');assert.equal(a.api.currentElapsed(), 27 * minute);
  a = a.reload();a.advance(10 * minute);assert.equal(a.api.currentElapsed(), 27 * minute);
  a.click('mainToggleButton');a.advance(2 * minute);a.click('mainToggleButton');a.advance(minute);a.click('finishButton');
  assert.equal(a.api.state.history[0].durationMs,29 * minute);
  assert.equal(a.api.state.history[0].overtimeMs,2 * minute);
});
test('natural completion after a Flow extension includes prior overtime', () => {
  const a = makeApp();a.click('mainToggleButton');a.advance(27 * minute);a.tick();a.click('addFiveButton');
  a.api.state.settings.flow = false;a.advance(5 * minute);a.tick();
  assert.equal(a.api.state.history[0].durationMs,32 * minute);
  assert.equal(a.api.state.history[0].overtimeMs,2 * minute);
});
test('idle focus completion is disabled on both surfaces and guarded internally', () => {
  const a = makeApp();assert.equal(a.el('finishButton').disabled,true);assert.equal(a.el('mobileFinishButton').disabled,true);
  a.api.finishCurrent();a.key('n');assert.equal(a.api.state.history.length,0);assert.equal(a.api.state.timer.mode,'focus');
  finish(a);assert.equal(a.api.state.history.length,1);assert.equal(a.el('finishButton').disabled,false);
  nextFocus(a);assert.equal(a.api.state.timer.mode,'focus');assert.equal(a.el('finishButton').disabled,true);
});
test('held shortcuts do not repeat complete, distraction or pause actions', () => {
  const a = makeApp();a.click('mainToggleButton');a.advance(minute);a.key('d');a.key('d',{repeat:true});assert.equal(a.api.state.timer.distractions,1);
  a.key('n');for(let i=0;i<5;i++)a.key('n',{repeat:true});assert.equal(a.api.state.history.length,1);assert.equal(a.api.state.timer.mode,'short');
  a.key(' ');a.key(' ',{repeat:true});assert.equal(a.api.state.timer.running,true);
});
test('Today totals and filter roll over at local midnight on tick or visibility', () => {
  for(const via of ['tick','visibility']) {
    const a = makeApp({time:new Date(2026,9,4,23,58).getTime()});finish(a);assert.equal(a.el('todaySessions').textContent,'1');
    a.click('historyTodayButton');assert.equal(a.el('historyList').children.length,1);
    a.advance(61 * 1000);if(via==='tick')a.tick();else a.events.visibilitychange();
    assert.equal(a.el('todaySessions').textContent,'0');assert.equal(a.el('historyList').children.length,0);
  }
});
test('all retained history is dated, searchable and independent of Today totals', () => {
  const seed=makeApp().persisted();seed.history=Array.from({length:300},(_,i)=>({id:String(i),endedAt:new Date(2026,9,4,12).getTime()-i*86400000,durationMs:minute,plannedMs:25*minute,overtimeMs:0,intention:i===299?'Old 日本語 target':'Other',round:1,distractions:0}));
  const a = makeApp({saved:seed});assert.equal(a.el('historyList').children.length,300);assert.match(a.el('historyList').children[0].children[0].textContent,/2026/);
  a.input('historySearchInput','日本語 TARGET');assert.equal(a.el('historyList').children.length,1);assert.equal(a.el('todaySessions').textContent,'1');
  a.click('historyTodayButton');assert.equal(a.el('historyList').children.length,0);assert.equal(a.el('exportCsvButton').disabled,true);
  a.click('historyAllButton');a.input('historySearchInput','');assert.equal(a.el('historyList').children.length,300);
});
test('reuse copies intention only into an untouched idle focus and never starts', () => {
  const a = makeApp();finish(a,'Reuse 日本語');let button=a.el('historyList').querySelectorAll('.history-reuse')[0];assert.ok(button);assert.equal(button.disabled,true);
  nextFocus(a);button=a.el('historyList').querySelectorAll('.history-reuse')[0];assert.equal(button.disabled,false);button.click();assert.equal(a.el('intentionInput').value,'Reuse 日本語');assert.equal(a.api.state.timer.running,false);
  a.click('mainToggleButton');a.advance(100);a.click('mainToggleButton');assert.equal(button.disabled,true);assert.equal(a.api.state.history.length,1);
});
test('filtered CSV safely escapes quotes, newlines, Unicode and formula prefixes; JSON keeps all data', async () => {
  const seed=makeApp().persisted();seed.history=['日本語,"quoted"\nline','=SUM(A1)',' +1','\t@cmd','-1','safe'].map((intention,i)=>({id:String(i),endedAt:Date.parse('2026-10-04T11:00:00Z'),startedAt:Date.parse('2026-10-04T10:59:00Z'),durationMs:minute,plannedMs:25*minute,overtimeMs:0,intention,round:1,distractions:0}));
  const a=makeApp({saved:seed});a.click('exportCsvButton');let csv=await a.downloads.at(-1).blob.text();assert.match(csv,/日本語,""quoted""\nline/);for(const text of ["'=SUM(A1)","' +1","'\t@cmd","'-1"])assert.ok(csv.includes(text),text);
  a.input('historySearchInput','日本語');a.click('exportCsvButton');csv=await a.downloads.at(-1).blob.text();assert.ok(csv.includes('日本語'));assert.ok(!csv.includes('SUM(A1)'));
  a.click('exportButton');const json=JSON.parse(await a.downloads.at(-1).blob.text());assert.equal(json.schemaVersion,1);assert.equal(json.data.history.length,6);
  a.input('historySearchInput','no match');const before=a.downloads.length;a.click('exportCsvButton');assert.equal(a.downloads.length,before);
});
test('deadline races preserve Flow elapsed on pause, finish and add-five before the next tick', () => {
  for(const action of ['pause','finish','add']) {
    const a=makeApp();a.click('mainToggleButton');a.advance(27*minute);
    if(action==='pause'){a.click('mainToggleButton');assert.equal(a.api.state.timer.flowOvertime,true);assert.equal(a.api.state.timer.running,false);a.click('mainToggleButton');assert.equal(a.api.currentElapsed(),27*minute);}
    if(action==='finish'){a.click('finishButton');assert.equal(a.api.state.history[0].durationMs,27*minute);}
    if(action==='add'){a.click('addFiveButton');assert.equal(a.api.currentElapsed(),27*minute);}
  }
});
test('natural expiry dates a completed session at its deadline without skipping the next phase', () => {
  for(const action of ['tick','pause','finish','add']) {
    const a=makeApp({time:new Date(2026,9,4,23,0).getTime()});a.api.state.settings.flow=false;a.click('mainToggleButton');const deadline=a.api.state.timer.endAt;
    a.advance(11*60*minute);if(action==='tick')a.tick();else a.click(action==='pause'?'mainToggleButton':action==='finish'?'finishButton':'addFiveButton');
    assert.equal(a.api.state.history[0].endedAt,deadline);assert.equal(a.api.state.timer.mode,'short');assert.equal(a.api.state.timer.remainingMs,5*minute);assert.equal(a.el('todaySessions').textContent,'0');
  }
});
test('keyboard shortcuts leave dialogs and editable targets alone', () => {
  for(const target of [{tagName:'SELECT'},{tagName:'DIV',isContentEditable:true}]) {const a=makeApp();a.key(' ',{target});assert.equal(a.api.state.timer.running,false);}
  const a=makeApp();a.click('mainToggleButton');a.advance(minute);a.click('helpButton');a.key('n');assert.equal(a.api.state.history.length,0);a.key(' ');assert.equal(a.api.state.timer.running,true);
});
test('changing settings never resets a session paused soon after starting', () => {
  const a=makeApp();a.click('mainToggleButton');a.advance(1000);a.click('mainToggleButton');a.click('settingsButton');a.el('focusMinutesInput').value=30;a.click('settingsSave');assert.equal(a.api.state.timer.plannedMs,25*minute);assert.equal(a.api.currentElapsed(),1000);
});
test('video PiP phase label keeps left alignment across repeated frames', () => {
  const a=makeApp();a.api.drawVideoPip();a.api.drawVideoPip();const labels=a.canvasCalls.filter(x=>x.text==='FOCUS');assert.equal(labels.length,2);assert.ok(labels.every(x=>x.align==='left'));
});
test('finish at the exact start instant cannot create a zero-duration session', () => {
  const a=makeApp();a.click('mainToggleButton');a.click('finishButton');assert.equal(a.api.state.history.length,0);assert.equal(a.api.state.timer.mode,'focus');
});
test('interactive PiP shares the finish guard across idle focus, active focus and break', async () => {
  const a=makeApp();await a.api.openDocumentPip();assert.equal(a.pipEl('pFinish').disabled,true);a.click('mainToggleButton');assert.equal(a.pipEl('pFinish').disabled,false);a.advance(minute);a.pipEl('pFinish').click();assert.equal(a.api.state.history.length,1);assert.equal(a.pipEl('pFinish').disabled,false);a.pipEl('pFinish').click();assert.equal(a.pipEl('pFinish').disabled,true);
});
test('Japanese history controls remain localized with filter and empty-state feedback', () => {
  const a=makeApp({locale:'ja'});assert.equal(a.el('historyAllButton').textContent,'すべて');assert.equal(a.el('exportCsvButton').textContent,'CSVを書き出す');finish(a,'集中');a.input('historySearchInput','missing');assert.equal(a.el('historyCount').textContent,'0件');assert.match(a.el('historyEmpty').textContent,/一致/);
});
