const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeApp } = require('./app-harness.cjs');

const expected = {
  ja: { language: 'EN', switchLabel: '英語に切り替え', help: '使い方と注意事項', close: '閉じる', privacy: '完全ローカル処理' },
  en: { language: 'JA', switchLabel: 'Switch to Japanese', help: 'How to use & notes', close: 'Close', privacy: 'Local-only processing' },
};

function assertLanguage(app, lang) {
  const copy = expected[lang];
  assert.equal(app.document.documentElement.lang, lang);
  assert.equal(app.el('languageButton').textContent, copy.language);
  for (const attr of ['aria-label', 'title']) {
    assert.equal(app.el('languageButton').attributes[attr], copy.switchLabel);
    assert.equal(app.el('helpButton').attributes[attr], copy.help);
  }
  assert.equal(app.el('helpClose').attributes['aria-label'], copy.close);
  assert.equal(app.el('localBadge').textContent, copy.privacy);
}

for (const locale of ['ja-JP', 'en-US']) {
  test(`header language and Help labels follow ${locale}, repeated toggles, and saved preference`, () => {
    const app = makeApp({ locale });
    let lang = locale.startsWith('ja') ? 'ja' : 'en';
    for (let i = 0; i < 5; i++) {
      assertLanguage(app, lang);
      app.click('helpButton');
      assert.equal(app.el('helpDialog').open, true);
      app.click('helpClose');
      assert.equal(app.el('helpDialog').open, false);
      app.click('languageButton');
      lang = lang === 'ja' ? 'en' : 'ja';
    }
    const reloaded = makeApp({ saved: app.persisted(), locale });
    assertLanguage(reloaded, lang);
  });
}

test('Japanese privacy badge uses the shared local-processing wording', () => {
  const app = makeApp({ locale: 'ja-JP' });
  assert.equal(app.el('localBadge').textContent, '完全ローカル処理');
  app.click('languageButton');
  assert.equal(app.el('localBadge').textContent, 'Local-only processing');
});

test('Help title is localized on initial load in each language', () => {
  for (const locale of ['ja', 'en']) {
    const app = makeApp({ locale });
    assert.equal(app.el('helpButton').attributes.title, expected[locale].help);
  }
});
