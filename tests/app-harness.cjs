const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the shipped inline application with a deterministic clock and minimal DOM.
// Timer behavior, event handlers, persistence and CSV generation are production code.
function makeApp({time = '2026-10-04T12:00:00Z', saved, file = process.env.POMODORO_TEST_HTML || 'src/index.template.html', locale = 'en', storageFailure = false, sharedLanguage = null, url = "https://example.test/", savedRaw,readFailure=false} = {}) {
  let clock = typeof time === 'number' ? time : Date.parse(time);
  let stored = savedRaw !== undefined ? savedRaw : saved ? JSON.stringify(saved) : null;
  const writes=[],timeouts=new Map(),revoked=[];let nextTimeout=0,downloadFailure=false,pipRequest=null;
  const elements = new Map(), events = {}, intervals = [], downloads = [], blobs = new Map();
  function element(tag = 'div') {
    let text = '', previousFocus;
    return {tagName: tag.toUpperCase(), dataset:{}, isConnected:true, value: '', checked: false, hidden: false, disabled: false, open: false, children: [], attributes: {}, listeners: {}, className: '', style: {setProperty() {}}, classList: {add() {}, remove() {}, toggle() {}},
      get textContent() { return text + this.children.map(x => x.textContent || '').join(''); },
      set textContent(value) { text = String(value); this.children = []; },
      set innerHTML(value) { text = value; this.children = []; },
      setAttribute(key, value) { this.attributes[key] = String(value); }, removeAttribute(key){delete this.attributes[key];}, contains(node){return node===this||this.children.some(child=>child.contains?.(node));},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      append(...children) { this.children.push(...children); }, appendChild(child) { this.children.push(child);child.parent=this; },
      querySelector() { return element(); },
      querySelectorAll(selector) { return this.children.flatMap(child => [...(selector === 'button' ? child.tagName === 'BUTTON' ? [child] : [] : child.className.split(' ').includes(selector.slice(1)) ? [child] : []), ...child.querySelectorAll(selector)]); },
      click() { if (this.disabled) return; if (this.tagName === 'A' && downloadFailure) throw Error('Synthetic download failure'); if (this.tagName === 'A') downloads.push({name: this.download, blob: blobs.get(this.href)}); return this.listeners.click?.({target: this}); },
      focus() { document.activeElement = this; }, remove() {if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.isConnected=false;},
      // Model the native dialog focus-restoration and unprevented Escape contract.
      // Actual browser geometry and native focus behavior need separate browser QA.
      showModal() { previousFocus = document.activeElement; this.open = true; },
      close() { if (!this.open) return; this.open = false; previousFocus?.focus(); this.listeners.close?.({target: this}); },
      cancel() { const event = {target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }}; this.listeners.cancel?.(event); if (!event.defaultPrevented) this.close(); }
    };
  }
  let raw = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const payload=raw.match(/<script id="payload" type="application\/octet-stream">([^<]+)<\/script>/);
  if(payload)raw=require('node:zlib').gunzipSync(Buffer.from(payload[1].trim(),'base64')).toString('utf8');
  for (const match of raw.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const node = element(match[1]);
    for (const attr of match[0].matchAll(/([\w-]+)="([^"]*)"/g)) node.setAttribute(attr[1], attr[2]);
    elements.set(match[2], node);
  }
  const el = id => elements.get(id) || null;
  el('bkCommonStyle').textContent=fs.readFileSync(path.join(__dirname,'../components/ui-conventions.css'),'utf8');
  const canvasCalls=[];
  const canvasContext={textAlign:"start",fillRect(){},fillText(text,x,y){canvasCalls.push({text,x,y,align:this.textAlign});}};
  el("pipCanvas").getContext=()=>canvasContext;
  const pipElements=new Map(['pMode','pRound','pTime','pTask','pToggle','pAdd','pFinish'].map(id=>[id,element()]));
  const pipWindow={closed:false,document:{documentElement:{},head:element(),body:element(),getElementById(id){return pipElements.get(id);}},addEventListener(){}};
  const document = {getElementById: el, createElement: element, documentElement: {}, body: element('body'), addEventListener(type, fn) { events[type] = fn; }};
  class FakeDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  const context = vm.createContext({document, window: {addEventListener() {},documentPictureInPicture:{async requestWindow(){return pipRequest?await pipRequest():pipWindow;}}}, navigator: {language: locale}, location:{href:url},history:{replaceState(){}},localStorage: {getItem(key) { if(readFailure&&key==='bk-pomodoro-v1')throw Error('read denied');return key==='browser-kitty:ui-language:v1'?sharedLanguage:key==='bk-pomodoro-v1'?stored:null; }, setItem(key, value) { if (storageFailure) throw new Error("Synthetic storage failure"); writes.push({key,value});if(key==='browser-kitty:ui-language:v1')sharedLanguage=value;else if(key==='bk-pomodoro-v1')stored = value; }}, Date: FakeDate, Intl, Blob, URL: class extends URL {static createObjectURL(blob) { const key = `blob:${blobs.size}`; blobs.set(key, blob); return key; } static revokeObjectURL(value) {revoked.push(value);}}, setTimeout(fn,ms) {const id=++nextTimeout;timeouts.set(id,{fn,ms});return id;}, clearTimeout(id) {timeouts.delete(id);}, setInterval(fn) { intervals.push(fn); return intervals.length; }, clearInterval() {}});
  const source = raw.match(/<script>\s*([\s\S]*?)<\/script>/)[1]
    .replace('__APP_CONFIG_JSON__', '{name:"Pomodoro Timer",version:"1.0.0"}')
    .replace('__BUILD_MANIFEST_JSON__', '{generatedAtUtc:"2026-10-04T00:00:00Z",dependencies:[]}')
    .replace('    init();', '    globalThis.testApi={get state(){return state},currentElapsed,currentFlowElapsed,saveState,finishCurrent,drawVideoPip,openDocumentPip};\n    init();');
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../components/ui-conventions.js'),'utf8'),context);
  vm.runInContext(source, context);
  context.testApi.state.settings.sound = false;
  return {context,pipWindow,setReadFailure(value){readFailure=value},writes,timeouts,revoked,setPipRequest(fn){pipRequest=fn}, get sharedLanguage(){return sharedLanguage},snapshot(){return JSON.parse(JSON.stringify(context.testApi.state))},setDownloadFailure(value){downloadFailure=value;},api: context.testApi, el, events, document, downloads, canvasCalls, pipEl:id=>pipElements.get(id), click(id) { if (!el(id)) throw Error(`Missing control: ${id}`); return el(id).click(); }, input(id, value) { el(id).value = value; el(id).listeners.input?.({target: el(id)}); }, advance(ms) {clock += ms;}, tick() {intervals[0]();}, reload() {context.testApi.saveState();return makeApp({time: clock, saved: JSON.parse(stored), file, locale, sharedLanguage});}, setStorageFailure(value) { storageFailure = value; }, persistedRaw(){return stored;}, persisted() {return JSON.parse(stored);}, key(key, extra = {}) {events.keydown({target: element(), key, code: key === ' ' ? 'Space' : `Key${key.toUpperCase()}`, preventDefault() {}, ...extra});}};
}
module.exports = {makeApp};
