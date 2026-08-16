# Pomodoro Timer

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-pomodoro-timer/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-pomodoro-timer/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-pomodoro-timer/)

[日本語版 README](README.ja.md)

A local-first, single-HTML Pomodoro timer designed around Picture-in-Picture, so the timer can stay visible without getting in the way of your work.

## 🚀 Live demo

### [Open Pomodoro Timer on GitHub Pages](https://ttomohisa.github.io/htmlapps-pomodoro-timer/)

GitHub Pages only delivers the initial HTML. Timer state, focus intentions, settings, and history are handled locally in your browser. The app has no account system, analytics, telemetry, or runtime network communication.

[![Pomodoro Timer screenshot](assets/screenshot.png)](https://ttomohisa.github.io/htmlapps-pomodoro-timer/)

## Features

- 25 / 5 / 15 minute Pomodoro cycle with customizable focus, short-break, and long-break durations
- Interactive **Document Picture-in-Picture** mini panel where supported
- Pause / resume, add five minutes, and finish a session directly from the PiP window
- **Canvas → Video Picture-in-Picture fallback** when interactive Document PiP is unavailable
- “One thing for this session” field instead of a full task-management system
- **Flow overtime** that keeps counting after the planned focus time instead of forcing an immediate break
- One-tap distraction counter with undo for accidental taps
- Drift-resistant timing derived from timestamps instead of interval tick counts
- Automatic short / long break progression
- Desktop notifications and locally generated completion sounds
- Today summary for focus time, completed sessions, and distractions
- Recent focus-session history stored in LocalStorage
- JSON export and import for local settings and history
- Japanese and English UI in the same HTML
- Mobile-first responsive UI with a safe-area-aware bottom control dock
- Embedded SVG favicon
- No runtime third-party libraries or external assets

## Quick start

### Use the web demo

Just [open the demo](https://ttomohisa.github.io/htmlapps-pomodoro-timer/). No installation or account is required.

### Use the downloaded HTML

1. Download [`dist/index.html`](https://github.com/ttomohisa/htmlapps-pomodoro-timer/blob/main/dist/index.html).
2. Open it in a current browser.
3. Enter what you want to finish during this focus session.
4. Press **Start**.

The timer works without PiP. PiP is an optional enhancement whose availability depends on the browser and execution context.

### Build your own standalone copy (advanced)

1. Download or clone this repository.
2. Double-click `build-standalone.bat` on Windows.
3. Copy the generated `dist/index.html` wherever you need it.
4. Open that one file later without an internet connection.

Python, Node.js, and a local web server are not required for the build. The repository uses Windows PowerShell and the built-in `tar.exe` provided by current Windows versions.

## Usage

1. Enter one thing to focus on in **What will you finish in this session?**
2. Press **Start**.
3. Open **PiP** on desktop if you want the timer to stay above another tab or app.
4. Press **Distracted** whenever your attention breaks.
5. Use **+5 min** if you intentionally want more time.
6. When the focus session is done, press **Finish & next**.
7. A short break follows normal focus sessions; every fourth completed focus round uses the long break.

### Flow overtime

With **Flow overtime** enabled, reaching `00:00` does not immediately force the timer into a break. Instead, the timer continues upward as overtime, for example `+03:42`.

This is useful when the Pomodoro interval helped you enter a productive flow state and stopping exactly at the planned duration would be more disruptive than helpful.

### Distraction counter

Press **Distracted** whenever you notice that your attention has moved away from the intended task. The current session records the count, and an accidental tap can be undone from the toast message.

The feature intentionally records only the number of interruptions; it does not ask you to maintain a detailed activity log.

## Picture-in-Picture

The app detects available browser features and uses the best PiP mode it can.

| Mode | Behavior |
| --- | --- |
| Document Picture-in-Picture | Interactive HTML mini window with timer, session intention, and controls |
| Video Picture-in-Picture | Canvas-rendered display-only timer; controls remain in the main window |
| No PiP | The normal Pomodoro timer remains fully usable |

Document Picture-in-Picture availability depends on the browser, OS, and security context. When unavailable, the app falls back gracefully instead of making PiP a requirement.

When the app is opened directly with `file://`, standard timer features still work, while some browser features such as Document PiP or notifications may be restricted by the browser.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Start / pause |
| `P` | Open / close PiP |
| `D` | Record a distraction |
| `N` | Finish the current session and advance |

Shortcuts are disabled while a form control has focus.

## Publish with GitHub Pages

The repository includes a workflow that builds the standalone HTML, verifies it, and deploys it to GitHub Pages.

1. Push the repository to GitHub as `htmlapps-pomodoro-timer`.
2. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main`, or manually run the Pages workflow from the Actions tab.
4. After a successful deployment, the demo is available at `https://ttomohisa.github.io/htmlapps-pomodoro-timer/`.

If Pages has not been enabled yet, the workflow still builds and uploads the standalone artifacts, then skips deployment without failing the build.

## Development and build layout

```text
.
├─ src/index.template.html       # Application source template
├─ app.config.json               # App metadata and build settings
├─ dependencies.json             # Embedded dependency definition (currently empty)
├─ build-standalone.bat          # Windows build entry point
├─ build-standalone.ps1          # Standalone HTML builder
├─ scripts/
│  ├─ check-repository.ps1       # Repository-wide validation
│  ├─ verify-standalone.ps1      # Standalone HTML verification
│  ├─ build-self-extract.ps1     # Self-extracting HTML builder
│  └─ verify-self-extract.ps1    # Self-extract verification
├─ dist/
│  ├─ index.html                 # Generated standalone app
│  └─ index.self-extract.html    # Generated gzip + Base64 self-extracting app
└─ .github/workflows/
   ├─ build-standalone.yml       # Pull request build validation
   └─ deploy-pages.yml           # Automatic Pages deployment from main
```

### Build

Run:

```powershell
.\build-standalone.ps1
```

or double-click / run:

```bat
build-standalone.bat
```

To validate the complete repository:

```powershell
.\scripts\check-repository.ps1
```

The build process:

- Injects app metadata and the build manifest into the HTML template
- Produces `dist/index.html`
- Verifies that required placeholders were resolved
- Verifies standalone runtime-network restrictions
- Generates dependency and build manifests
- Produces and verifies `dist/index.self-extract.html`

## Privacy and runtime network protection

The generated HTML is designed to keep timer data on the device.

- Settings, active timer state, and history are stored in browser LocalStorage
- No login or cloud account is required
- No analytics or telemetry is included
- No external script, stylesheet, font, frame, or runtime dependency is required
- The Content Security Policy includes `connect-src 'none'`
- Runtime network communication is not required for the app itself

The GitHub Pages version requires the initial HTML request to load the app. After that, the timer data handled by the application remains local. To use it with the network fully disconnected, open the generated `dist/index.html` locally.

Use **Export JSON** if you want to keep a backup before clearing browser storage or moving to another browser profile.

## Limitations

- Document Picture-in-Picture is not available in every browser.
- Video PiP fallback availability also varies by browser and OS.
- Some browser features can be restricted when the HTML is opened directly with `file://`.
- Desktop notifications require browser permission and may be unavailable in some execution contexts.
- Local history is lost if the browser's site data / LocalStorage is cleared unless it has been exported first.
- The app intentionally does not include cloud sync, shared tasks, or a full project / ToDo manager.

## Dependencies

The current application has **no runtime third-party library dependencies**. Timing, PiP handling, Canvas fallback, persistence, notifications, sounds, and UI behavior are implemented with browser APIs and vanilla JavaScript.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.

## Contributing

Bug reports and feature proposals are welcome through GitHub Issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## License

Copyright © 2026 ttomohisa

Licensed under the [MIT License](LICENSE).
