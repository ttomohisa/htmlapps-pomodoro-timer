const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const { makeApp } = require('./app-harness.cjs');

// Follow the canonical checker's source/standalone/self-extract selection.
let html = fs.readFileSync(path.resolve(__dirname, '..', process.env.POMODORO_TEST_HTML || 'src/index.template.html'), 'utf8');
const payload = html.match(/<script id="payload" type="application\/octet-stream">([^<]+)<\/script>/);
if (payload) html = gunzipSync(Buffer.from(payload[1].trim(), 'base64')).toString('utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];

// Structural regressions only: real wheel movement and dialog geometry need native QA.
for (const root of ['html', 'body']) {
  test(`${root} stops background scrolling only while a native modal is open`, () => {
    const rule = rules.find(([, selectors]) => selectors.split(',').map(s => s.trim()).includes(`${root}:has(dialog:modal)`));
    assert.ok(rule, `${root} needs a shared native-modal scroll lock`);
    assert.match(rule[2], /(?:^|;)\s*overflow\s*:\s*hidden\s*(?:;|$)/);
  });
}

test('local-processing badge uses the shared decorative shield and check', () => {
  const badge = html.match(/<div class="local-badge">([\s\S]*?)<span id="localBadge">/);
  assert.ok(badge, 'existing local-processing badge is present');
  assert.match(badge[1], /<svg\b[^>]*aria-hidden="true"/);
  assert.match(badge[1], /d="M12 3 5 6v5c0 4\.6 2\.8 8 7 10 4\.2-2 7-5\.4 7-10V6z"/);
  assert.match(badge[1], /d="m9 12 2 2 4-5"/);
  assert.doesNotMatch(badge[1], /M7 10V8a5 5/);
});

test('Help explains modal scrolling in both languages', () => {
  const app = makeApp({ locale: 'ja-JP' });
  assert.match(app.el('helpBody').textContent, /ダイアログを開いている間は背景のスクロールを止めます/);
  app.click('languageButton');
  assert.match(app.el('helpBody').textContent, /Background scrolling is paused while a dialog is open/);
});
