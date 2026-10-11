const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const removed = [
  "<h3>ダイアログのスクロール</h3><p>ダイアログを開いている間は背景のスクロールを止めます。使い方や設定が長い場合は、ダイアログの本文をスクロールしてください。</p>",
  "<h3>Dialog scrolling</h3><p>Background scrolling is paused while a dialog is open. Scroll the dialog body to reach longer Help or Settings content.</p>"
];
for (const file of ['src/index.template.html', 'pomodoro-timer.html']) {
  test(`${file}: user help omits layout implementation commentary`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const text of removed) assert.ok(!html.includes(text), `Remove implementation copy from ${file}`);
  });
}
