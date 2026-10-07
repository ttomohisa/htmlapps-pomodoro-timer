const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeApp } = require('./app-harness.cjs');

// The live v1.0.0 Help bounds reported during baseline QA.
const bounds = { left: 257.5, top: 14, right: 907.5, bottom: 743 };

function openHelp(app) {
  app.el('helpButton').focus();
  app.click('helpButton');
  const dialog = app.el('helpDialog');
  dialog.getBoundingClientRect = () => bounds;
  app.el('helpClose').focus();
  assert.equal(dialog.open, true);
  return dialog;
}

function clickDialog(dialog, clientX, clientY, target = dialog) {
  dialog.listeners.click?.({ target, currentTarget: dialog, clientX, clientY });
}

for (const locale of ['ja-JP', 'en-US']) {
  test(`Help dismisses true exterior clicks and restores the opener in ${locale}`, () => {
    const app = makeApp({ locale });
    for (const [x, y] of [[100, 370], [1000, 370], [500, 0], [500, 800], [0, 0]]) {
      const dialog = openHelp(app);
      clickDialog(dialog, x, y);
      assert.equal(dialog.open, false, `Exterior click at ${x}, ${y} must close Help`);
      assert.equal(app.document.activeElement, app.el('helpButton'));
    }
  });

  test(`Help preserves interior, padding, boundary, and descendant clicks in ${locale}`, () => {
    const app = makeApp({ locale }), dialog = openHelp(app);
    for (const [x, y] of [[500, 370], [258, 15], [907, 742], [257.5, 370], [907.5, 370], [500, 14], [500, 743]]) {
      clickDialog(dialog, x, y);
      assert.equal(dialog.open, true, `Inside/boundary click at ${x}, ${y} must keep Help open`);
      assert.equal(app.document.activeElement, app.el('helpClose'));
    }
    // A bubbled event is not a backdrop click, even with exterior coordinates.
    clickDialog(dialog, 100, 370, app.el('helpBody'));
    assert.equal(dialog.open, true);
  });

  test(`Help keeps Close and native Escape working across repeated reopen in ${locale}`, () => {
    const app = makeApp({ locale });
    for (const dismiss of ['close', 'escape', 'close', 'escape']) {
      const dialog = openHelp(app);
      if (dismiss === 'close') app.click('helpClose');
      else dialog.cancel();
      assert.equal(dialog.open, false);
      assert.equal(app.document.activeElement, app.el('helpButton'));
    }
  });

  test(`Help returns focus to its opener when pointer activation did not focus it in ${locale}`, () => {
    const app = makeApp({ locale });
    for (const dismiss of ['backdrop', 'close', 'escape']) {
      // Some browsers do not focus a button on pointer activation.
      app.el('intentionInput').focus();
      app.click('helpButton');
      const dialog = app.el('helpDialog');
      dialog.getBoundingClientRect = () => bounds;
      app.el('helpClose').focus();
      if (dismiss === 'backdrop') clickDialog(dialog, 100, 370);
      else if (dismiss === 'close') app.click('helpClose');
      else dialog.cancel();
      assert.equal(dialog.open, false);
      assert.equal(app.document.activeElement, app.el('helpButton'));
    }
  });
}
