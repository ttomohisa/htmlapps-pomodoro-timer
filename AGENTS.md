# AGENTS.md

## Product contract

This repository follows the `ttomohisa/htmlapps-template` conventions.

- The shipped application must be a fully self-contained HTML file.
- Runtime network access is forbidden by CSP (`connect-src 'none'`).
- The app must work without an account, server, analytics, telemetry, or tracking.
- Japanese and English UI are both required.
- Light mode only. Do not add a dark-mode switch.
- Mobile UI is a first-class target from 320 px width.
- Keep the header compact; language and help actions have no decorative background.
- Use in-app dialogs instead of `window.alert()` / `window.confirm()` for product UI.
- Persist only app state and local history in `localStorage`.
- `src/index.template.html` is the source of truth. `dist/` is generated.

## Build

Run `build-standalone.bat` on Windows or `./build-standalone.ps1` in PowerShell.
`./scripts/check-repository.ps1` is the CI entrypoint.

## Pomodoro-specific rules

- Timer calculations must use wall-clock timestamps so background throttling does not accumulate drift.
- Document Picture-in-Picture is preferred when available. Video PiP is a display-only fallback.
- Never make PiP support a prerequisite for using the timer.
- Flow overtime, distraction counts, current intention, and local history must remain usable without network access.
