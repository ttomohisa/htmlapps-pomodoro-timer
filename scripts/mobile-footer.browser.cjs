// Focused layout regression. No real user data, face images, camera, PiP or notification access.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const cfg={"slug": "pomodoro-timer", "bp": 620, "footer": "body > footer", "badge": "#localBadge", "nav": ".mobile-dock", "open": "#helpButton", "lang": "#languageButton", "head": ".dialog-header", "end": "#footerDeps"};
async function main(){const evidence=path.resolve('test-results/mobile-footer');fs.mkdirSync(evidence,{recursive:true});const browser=await chromium.launch();
try{const cases=[];for(const language of ['ja','en'])for(const [width,height]of [[1360,900],[cfg.bp+1,568],[cfg.bp,568],[320,568],[393,252]])cases.push({file:'dist/index.html',language,width,height});cases.push({file:cfg.slug+'.html',language:'en',width:360,height:640});if(cfg.slug!=='popup-face-check-in')cases.push({file:'dist/index.self-extract.html',language:'ja',width:360,height:640});
for(const {file,language,width,height}of cases){const context=await browser.newContext({viewport:{width,height},locale:language,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[],label=`${file} ${language} ${width}x${height}`;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
try{await page.goto(pathToFileURL(path.resolve(file)).href);await page.locator(cfg.open).waitFor();
if(cfg.slug==='popup-face-check-in'){await page.locator('#sessionDialog').waitFor();await page.locator('#privacyAck').check();await page.locator('#sessionStartBtn').click();await page.locator('#sessionDialog').waitFor({state:'hidden'});await page.locator('#runtime.ready').waitFor({timeout:60000});}
if(await page.locator('html').getAttribute('lang')!==language)await page.locator(cfg.lang).click();
assert.equal((await page.locator(cfg.badge).textContent()).trim(),language==='en'?'Fully local processing':'完全ローカル処理',label+': canonical badge');
if(await page.locator(cfg.badge).isVisible()){const r=await page.locator(cfg.badge).boundingBox();assert.ok(r&&r.x>=0&&r.x+r.width<=width,label+': visible badge fits');}
assert.equal(await page.locator(cfg.footer).isVisible(),width>cfg.bp,label+': informational footer');assert.equal(await page.locator(cfg.nav).isVisible(),width<=cfg.bp,label+': functional controls');if(width<=cfg.bp){const r=await page.locator(cfg.nav).boundingBox();assert.ok(r&&r.x>=0&&r.x+r.width<=width&&r.y>=0&&r.y+r.height<=height,label+': functional bar fits viewport');}
if(cfg.slug==='text-inspector'){await page.locator('#textInput').fill('Synthetic local text.');assert.equal(await page.locator('#textInput').inputValue(),'Synthetic local text.');}
if(cfg.slug==='pomodoro-timer'){
const design=await page.evaluate(()=>{
  const css=selector=>getComputedStyle(document.querySelector(selector));
  const primary=document.querySelector(innerWidth<=620?'#mobileToggleButton':'#mainToggleButton');
  const p=primary.getBoundingClientRect();
  return {sidebarBorder:css('.side-stack > .card').borderTopWidth,historyBorder:css('.history-card').borderTopWidth,pipFill:css('#pipButton').backgroundColor,pipBorder:css('#pipButton').borderTopWidth,pipHeight:document.querySelector('#pipButton').getBoundingClientRect().height,pipTitleLeft:document.querySelector('#pipTitle').getBoundingClientRect().left,todayTitleLeft:document.querySelector('#todayTitle').getBoundingClientRect().left,quickTitleLeft:document.querySelector('#quickTitle').getBoundingClientRect().left,pipTitleIconCount:document.querySelectorAll('.pip-card .pip-icon').length,pipButtonIconCount:document.querySelectorAll('#pipButton svg').length,footerSeparators:[...document.querySelectorAll('footer .build-line>span')].map(x=>getComputedStyle(x,'::after').content),primaryBackground:css(innerWidth<=620?'#mobileToggleButton':'#mainToggleButton').backgroundColor,secondaryBackground:css(innerWidth<=620?'#mobileAddButton':'#finishButton').backgroundColor,primaryHeight:p.height,dockBorder:css('.mobile-dock').borderTopWidth};
});
assert.equal(design.sidebarBorder,'0px',label+': sidebar uses headings and rules, not nested cards');
assert.equal(design.historyBorder,'0px',label+': history rows have no outer box');
assert.equal(design.pipBorder,'1px',label+': PiP action is recognizably a button');
assert.equal(design.pipFill,'rgb(227, 241, 236)',label+': PiP action has a soft green fill, not a transparent or white link-like surface');
assert.ok(design.pipHeight>=44,label+': PiP button has a usable touch target');
assert.ok(Math.abs(design.pipTitleLeft-design.todayTitleLeft)<1&&Math.abs(design.pipTitleLeft-design.quickTitleLeft)<1,label+': all sidebar headings share the same left edge');
assert.equal(design.pipTitleIconCount,0,label+': no decorative section icon');assert.equal(design.pipButtonIconCount,1,label+': button PiP icon restored');
if(width>cfg.bp)assert.deepEqual(design.footerSeparators,['"·"','"·"','none'],label+': exactly two footer separators');
assert.ok(design.primaryHeight>=44,label+': start action is touch accessible');
assert.notEqual(design.primaryBackground,design.secondaryBackground,label+': main and secondary actions have different emphasis');
if(width<=cfg.bp){assert.equal(design.dockBorder,'1px',label+': dock is grounded with a single top divider');await page.locator('#mobileToggleButton').click();await page.locator('#mobileToggleButton').click();assert.match(await page.locator('#timerTime').textContent(),/\d+:\d+/);}
}
if(cfg.slug==='pomodoro-timer'){
 const disclosure=page.locator('#historyExport'),summary=disclosure.locator('summary');
 assert.equal(await disclosure.getAttribute('open'),null,label+': exports folded by default');
 assert.equal((await summary.textContent()).trim(),language==='ja'?'データを書き出す':'Export data',label+': localized menu');
 await summary.click();
 assert.notEqual(await disclosure.getAttribute('open'),null,label+': exports expand on click');
 await page.locator('.history-export-menu').click({position:{x:8,y:8}});
 assert.notEqual(await disclosure.getAttribute('open'),null,label+': inside-menu click keeps exports open');
 assert.equal(await page.locator('#exportCsvButton').isVisible(),true,label+': CSV option shown');
 assert.equal(await page.locator('#exportButton').isVisible(),true,label+': JSON option shown');
 assert.match((await page.locator('#exportCsvButton').textContent()).trim(),language==='ja'?/表示中.*CSV/:/visible history.*CSV/i);
 assert.match((await page.locator('#exportButton').textContent()).trim(),language==='ja'?/設定.*全履歴.*JSON/:/settings.*all history.*JSON/i);
 const options=await page.locator('.history-export-menu').boundingBox();
 assert.ok(options&&options.x>=0&&options.x+options.width<=width,label+': export menu stays inside viewport');
 await page.locator('#historyTitle').click();
 assert.equal(await disclosure.getAttribute('open'),null,label+': clicking outside collapses exports');
 await summary.click();
 assert.notEqual(await disclosure.getAttribute('open'),null,label+': exports reopen');
 await summary.focus();
 await page.keyboard.press('Escape');
 assert.equal(await disclosure.getAttribute('open'),null,label+': Escape collapses exports');
 assert.equal(await summary.evaluate(el=>document.activeElement===el),true,label+': keyboard focus returns to summary');
 await summary.click();
 assert.notEqual(await disclosure.getAttribute('open'),null,label+': exports can reopen again');
 await summary.click();
 assert.equal(await disclosure.getAttribute('open'),null,label+': exports collapse again');
}
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': page width');
await page.locator(cfg.open).click();const body=page.locator('#helpDialog .dialog-body');await body.evaluate(e=>{e.scrollTop=e.scrollHeight});
if(cfg.slug==='pomodoro-timer'){assert.ok(await body.evaluate(e=>e.lastElementChild.contains(document.querySelector('#footerBuild'))));assert.match(await page.locator('#footerBuild').textContent(),/Build .*\d{4}/);assert.match(await page.locator('#footerDeps').textContent(),/Dependencies 0/);}
if(cfg.slug==='text-inspector'){assert.equal(await page.locator('#buildInfo').count(),1);assert.match(await page.locator('#buildInfo').textContent(),/^v\d.*UTC$/);assert.ok(await body.evaluate(e=>e.lastElementChild.contains(document.querySelector('#buildInfo'))));}
const bounds=await page.locator(cfg.end).evaluate(e=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let t,last;while(t=walker.nextNode())if(t.textContent.trim())last=t;const r=document.createRange();r.setStart(last,last.textContent.length-1);r.setEnd(last,last.textContent.length);const b=r.getBoundingClientRect();let top=0,bottom=innerHeight;for(let p=e.parentElement;p;p=p.parentElement)if(/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)){const x=p.getBoundingClientRect();top=Math.max(top,x.top);bottom=Math.min(bottom,x.bottom)}return{top:b.top,bottom:b.bottom,clipTop:top,clipBottom:bottom}});
assert.ok(bounds.top>=bounds.clipTop-1&&bounds.bottom<=bounds.clipBottom+1,label+': Help end '+JSON.stringify(bounds));assert.ok(await body.evaluate(e=>e.scrollWidth<=e.clientWidth+1),label+': Help width');const header=await page.locator('#helpDialog '+cfg.head).boundingBox();assert.ok(header&&header.y>=0&&header.y+header.height<=height,label+': Help header');
if(file==='dist/index.html'&&[1360,320].includes(width))await page.screenshot({path:path.join(evidence,`${language}-${width}.png`)});
const box=await page.locator('#helpDialog').boundingBox(),point=[[1,1],[width-1,1],[1,height-1],[width-1,height-1]].find(([x,y])=>x<box.x||x>box.x+box.width||y<box.y||y>box.y+box.height);assert.ok(point,label+': genuine backdrop');const y=await page.evaluate(()=>scrollY);await page.mouse.move(...point);await page.mouse.wheel(0,400);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>scrollY),y,label+': background locked');
await page.keyboard.press('Escape');assert.equal(await page.locator('#helpDialog').isVisible(),false);await page.locator(cfg.lang).click();await page.locator(cfg.lang).click();await page.locator(cfg.open).click();if(cfg.slug==='pomodoro-timer'){for(const id of ['footerBuild','footerDeps'])assert.equal(await page.locator('#'+id).count(),1);assert.match(await page.locator('#footerBuild').textContent(),/Build .*\d{4}/);assert.equal((await page.locator('#footerDeps').textContent()).trim(),'Dependencies 0');}if(cfg.slug==='text-inspector'){assert.equal(await page.locator('#buildInfo').count(),1);assert.match(await page.locator('#buildInfo').textContent(),/^v\d.*UTC$/);}await page.locator('#helpClose').click();assert.equal(await page.locator('#helpDialog').isVisible(),false);
assert.deepEqual(errors,[],label+': console errors');assert.deepEqual(requests,[],label+': network');console.log('PASS '+label);
}catch(e){await page.screenshot({path:path.join(evidence,'failure.png')}).catch(()=>{});throw new Error(label+': '+e.message,{cause:e})}finally{await context.close()}}
}finally{await browser.close()}}
main().catch(e=>{console.error(e);process.exitCode=1});
