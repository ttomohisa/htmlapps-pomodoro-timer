const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { createHash } = require('node:crypto');
const { gunzipSync } = require('node:zlib');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const asset = read('assets/favicon.svg');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)=(["'])(.*?)\2/gs)].map(m => [m[1], m[3]]));
function favicon(html) {
  const tag = html.match(/<link\b[^>]*rel=["']icon["'][^>]*>/);
  assert.ok(tag, 'favicon exists');
  const uri = attrs(tag[0]).href;
  const svg = uri.includes(';base64,') ? Buffer.from(uri.split(',')[1], 'base64').toString() : decodeURIComponent(uri.slice(uri.indexOf(',') + 1));
  assert.equal(svg.trim(), asset.trim(), 'embedded favicon preserves the complete canonical SVG');
}
test('canonical icon preserves the supplied artwork byte for byte', () => {
  assert.equal(createHash('sha256').update(asset).digest('hex'), 'b9681a628dbc05128dc143eb40201bcf2a98b9701fd184ede0f63d473c09424b');
});
test('canonical background keeps brand color and quarter-side radii', () => {
  const svg = attrs(asset.match(/<svg\b[^>]*>/)[0]);
  const rect = attrs(asset.match(/<rect\b[^>]*>/)[0]);
  assert.equal(svg.viewBox, '0 0 64 64');
  assert.equal(rect.fill || svg.fill, '#16624f');
  assert.equal(Number(rect.width), 64);
  assert.equal(Number(rect.height), 64);
  assert.equal(Number(rect.rx), 16);
  assert.equal(Number(rect.ry || rect.rx), 16);
});
for (const file of ['src/index.template.html', 'dist/index.html', 'pomodoro-timer.html']) test(`${file} keeps canonical header and favicon artwork`, () => {
  const html = read(file);
  const mark = html.match(/<div class="brand-mark"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(mark, 'brand mark exists');
  assert.equal(mark[1].trim(), asset.trim(), 'header includes canonical root attributes and artwork');
  favicon(html);
  assert.match(html, /\.brand-mark\s*>\s*svg\s*\{[^}]*width:\s*100%[^}]*height:\s*100%/);
  assert.doesNotMatch(html, /\.brand-mark\s+svg\s*\{/);
});
test('self-extract loader keeps favicon and restores readable HTML exactly', () => {
  const html = read('dist/index.self-extract.html');
  favicon(html);
  const payload = html.match(/<script id="payload"[^>]*>([A-Za-z0-9+/=\s]+)<\/script>/);
  assert.ok(payload);
  assert.equal(gunzipSync(Buffer.from(payload[1], 'base64')).toString(), read('dist/index.html'));
});
