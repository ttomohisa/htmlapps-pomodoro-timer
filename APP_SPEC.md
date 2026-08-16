# APP_SPEC.md

## 1. Product identity

- **Working name:** Pomodoro Timer / ポモドーロタイマー
- **One-sentence purpose:** Keep the current focus session visible and controllable in a small Picture-in-Picture window while the user works elsewhere.
- **Primary users:** People who work in browser tabs, editors, spreadsheets, and desktop apps and want a lightweight focus timer without an account.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`

## 2. Problem and outcome

A normal browser timer disappears behind the work it is timing. This app keeps time, the current one-line intention, and essential controls close at hand through PiP while staying fully local.

## 3. Core user flow

1. Open the app locally or on GitHub Pages / Browser Kitty.
2. Enter one thing to finish during the current focus session.
3. Start a 25-minute focus session.
4. Optionally open PiP and continue working in another tab or application.
5. Record a distraction with one tap if focus breaks.
6. Finish the task, continue into Flow overtime, or let the timer advance to a break.
7. Review today's focus time, completed sessions, distractions, and recent local history.

## 4. Functional requirements

- Default cycle: focus 25 min, short break 5 min, long break 15 min, long break after 4 focus rounds.
- Customizable focus, short-break, and long-break durations.
- Start, pause, resume, add five minutes, complete/advance, and reset controls.
- One-line intention shown in the main UI and interactive PiP.
- Distraction counter with undo.
- Optional Flow mode: after focus reaches zero, count overtime upward until the user finishes.
- Interactive Document Picture-in-Picture when available.
- Canvas/video Picture-in-Picture fallback when Document PiP is unavailable.
- Desktop notifications and synthesized local chime are optional.
- Local history and today summary stored in `localStorage`.
- JSON export of local data.
- Japanese/English UI without reload.
- Keyboard shortcuts when focus is not inside a form control.

## 5. Data and privacy

- All settings, history, and the current intention remain in browser storage.
- The app performs no runtime network request.
- No login, analytics, telemetry, advertising SDK, or server-side storage is included.

## 6. Non-goals

- Full task/project management.
- Cloud sync or accounts.
- Team collaboration.
- AI coaching.
- Cross-device statistics.

## 7. UX and accessibility

- Responsive from 320 px upward.
- Mobile layout should feel app-like with a prominent timer and safe-area-aware bottom controls.
- All icon-only controls need accessible names.
- Keyboard focus must be visible.
- Motion must respect `prefers-reduced-motion`.
- Status and toast messages use an `aria-live` region.
- Destructive resets use an in-app confirmation dialog.

## 8. Performance expectations

- First interaction works without network access.
- Timer stays accurate after background throttling or sleep by calculating from timestamps.
- Re-rendering is limited to small timer/status regions.

## 9. Browser target

Current stable desktop/mobile Chromium, Firefox, and Safari for the normal timer. PiP is progressively enhanced and feature-detected; interactive Document PiP is expected mainly on supported Chromium desktop browsers.

## 10. Acceptance criteria

- `scripts/check-repository.ps1` builds and verifies both standalone artifacts.
- The generated HTML has no unresolved placeholders or external runtime assets.
- CSP includes `connect-src 'none'`.
- Timer works without PiP.
- Running timer survives reload with correct remaining time or overtime state.
- Main actions stay usable at 360 px width.
- Document PiP controls can pause/resume, add five minutes, and finish/advance when the API is available.
- Fallback video PiP shows mode, time, round, and intention.
- Local data can be exported as JSON and cleared only after confirmation.

## In-app help

The upper-right help action opens bilingual instructions covering timer flow, PiP capability differences, Flow mode, local privacy, keyboard shortcuts, notifications, and browser limitations.
