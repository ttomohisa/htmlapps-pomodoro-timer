const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the shipped inline application with a deterministic clock and minimal DOM.
// Timer behavior, event handlers, persistence and CSV generation are production code.
function makeApp({time = '2026-10-04T12:00:00Z', saved, file = process.env.POMODORO_TEST_HTML || 'src/index.template.html', locale = 'en', storageFailure = false, documentPipFails = false, videoPip = false} = {}) {
  let clock = typeof time === 'number' ? time : Date.parse(time);
  let stored = saved ? JSON.stringify(saved) : null;
  const elements = new Map(), events = {}, intervals = [], downloads = [], blobs = new Map(), notifications = [];
  const audio = {created:0, resumes:0, starts:0};
  class FakeAudioContext {
    constructor(){audio.created++;this.state='suspended';this.currentTime=0;this.destination={};}
    resume(){audio.resumes++;this.state='running';return Promise.resolve();}
    createOscillator(){return {frequency:{value:0},connect(){},start(){audio.starts++},stop(){}};}
    createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  }
  class FakeNotification{static permission='granted';static requestPermission(){return Promise.resolve('granted');}constructor(title,options){notifications.push({title,...options});}}
  function element(tag = 'div') {
    let text = '', previousFocus;
    return {tagName: tag.toUpperCase(), value: '', checked: false, hidden: false, disabled: false, open: false, children: [], attributes: {}, listeners: {}, className: '', style: {setProperty() {}}, classList: {add() {}, remove() {}, toggle() {}},
      get textContent() { return text + this.children.map(x => x.textContent || '').join(''); },
      set textContent(value) { text = String(value); this.children = []; },
      set innerHTML(value) { text = value; this.children = []; },
      setAttribute(key, value) { this.attributes[key] = String(value); },
      addEventListener(type, fn) { this.listeners[type] = fn; },
      append(...children) { this.children.push(...children); }, appendChild(child) { this.children.push(child); },
      querySelector() { return element(); },
      querySelectorAll(selector) { return this.children.flatMap(child => [...(selector === 'button' ? child.tagName === 'BUTTON' ? [child] : [] : child.className.split(' ').includes(selector.slice(1)) ? [child] : []), ...child.querySelectorAll(selector)]); },
      click() { if (this.disabled) return; if (this.tagName === 'A') downloads.push({name: this.download, blob: blobs.get(this.href)}); return this.listeners.click?.({target: this}); },
      focus() { document.activeElement = this; }, remove() {},
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
  const canvasCalls=[];
  const canvasContext={textAlign:"start",fillRect(){},fillText(text,x,y){canvasCalls.push({text,x,y,align:this.textAlign});}};
  el("pipCanvas").getContext=()=>canvasContext;
  const pipElements=new Map(['pMode','pRound','pTime','pTask','pToggle','pAdd','pFinish'].map(id=>[id,element()]));
  const pipWindow={closed:false,document:{documentElement:{},head:element(),body:element(),getElementById(id){return pipElements.get(id);}},addEventListener(){},close(){this.closed=true;}};
  const document = {getElementById: el, createElement: element, documentElement: {}, body: element('body'), pictureInPictureEnabled:videoPip, pictureInPictureElement:null,addEventListener(type, fn) { events[type] = fn; }};
  el('pipCanvas').captureStream=()=>({});el('pipVideo').play=()=>Promise.resolve();
  if(videoPip)el('pipVideo').requestPictureInPicture=async()=>{document.pictureInPictureElement=el('pipVideo');};
  class FakeDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  const context = vm.createContext({document, window: {addEventListener() {},AudioContext:FakeAudioContext,Notification:FakeNotification,documentPictureInPicture:{async requestWindow(){if(documentPipFails)throw Error('Document PiP blocked');return pipWindow;}}}, navigator: {language: locale}, localStorage: {getItem() { return stored; }, setItem(key, value) { if (storageFailure) throw new Error("Synthetic storage failure"); stored = value; }}, Date: FakeDate, Intl, Blob, Notification:FakeNotification, URL: {createObjectURL(blob) { const key = `blob:${blobs.size}`; blobs.set(key, blob); return key; }, revokeObjectURL() {}}, setTimeout() {return 1;}, clearTimeout() {}, setInterval(fn) { intervals.push(fn); return intervals.length; }, clearInterval() {}});
  const source = raw.match(/<script>\s*([\s\S]*?)<\/script>/)[1]
    .replace('__APP_CONFIG_JSON__', '{name:"Pomodoro Timer",version:"1.0.0"}')
    .replace('__BUILD_MANIFEST_JSON__', '{generatedAtUtc:"2026-10-04T00:00:00Z",dependencies:[]}')
    .replace('    init();', '    globalThis.testApi={get state(){return state},get pipKind(){return pipKind},currentElapsed,currentFlowElapsed,saveState,finishCurrent,drawVideoPip,openDocumentPip};\n    init();');
  vm.runInContext(source, context);
  context.testApi.state.settings.sound = false;
  return {api: context.testApi, el, events, document, audio, notifications, downloads, canvasCalls, pipEl:id=>pipElements.get(id), click(id) { if (!el(id)) throw Error(`Missing control: ${id}`); return el(id).click(); }, input(id, value) { el(id).value = value; el(id).listeners.input?.({target: el(id)}); }, advance(ms) {clock += ms;}, tick() {intervals[0]();}, reload() {context.testApi.saveState();return makeApp({time: clock, saved: JSON.parse(stored), file, locale});}, setStorageFailure(value) { storageFailure = value; }, persisted() {return JSON.parse(stored);}, key(key, extra = {}) {events.keydown({target: element(), key, code: key === ' ' ? 'Space' : `Key${key.toUpperCase()}`, preventDefault() {}, ...extra});}};
}
module.exports = {makeApp};
