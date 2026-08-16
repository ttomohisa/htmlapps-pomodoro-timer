# Pomodoro Timer

[日本語](README.ja.md)

**Keep it in the corner while you work.**

A local-first Pomodoro timer designed around Picture-in-Picture. The timer, current intention, history, and settings stay in the browser.

![Pomodoro Timer](assets/screenshot.png)

## Highlights

- **Interactive PiP** — On Document Picture-in-Picture capable browsers, pause/resume, add five minutes, and finish directly from the floating window.
- **PiP fallback** — When Document PiP is unavailable, Canvas → Video PiP keeps the timer visible where supported.
- **One intention** — No full task manager; keep just the one thing you are doing now in view.
- **Flow overtime** — Continue beyond the planned focus duration and count upward as `+03:42` instead of forcing a break.
- **Distraction counter** — Record a break in attention with one tap and undo accidental taps from the toast.
- **Drift-resistant timing** — Remaining time is derived from timestamps instead of trusting interval ticks.
- **Local history** — Today totals and recent completed focus sessions are stored in LocalStorage.
- **Local-only** — No account, server storage, analytics, tracking, or runtime third-party dependencies.
- **Japanese / English** — Switch languages without reloading.
- **Mobile-first** — Responsive from 320px with a safe-area-aware mobile control dock.

## Quick start

1. Open `dist/index.html` in a browser.
2. Enter one thing to finish during this session.
3. Press **Start**.
4. On desktop, use **Open PiP** when you want the timer above another tab or app.
5. Tap **Distracted** whenever attention breaks.
6. Use **Finish & next** when done; every fourth focus round is followed by a long break.

## Picture-in-Picture modes

| Mode | Behavior |
| --- | --- |
| Document Picture-in-Picture | Interactive HTML mini window with timer and controls |
| Video Picture-in-Picture | Display-only Canvas-rendered timer; controls remain in the main window |
| No PiP | Normal timer remains fully usable |

PiP availability depends on browser, OS, and security-context requirements. The application never requires PiP to function.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Start / pause |
| `P` | Open / close PiP |
| `D` | Record a distraction |
| `N` | Finish and advance |

Shortcuts do not fire while a form control has focus.

## Privacy

Settings, active timer state, and focus history are saved to LocalStorage. The runtime CSP contains `connect-src 'none'`, preventing runtime network connections.

There are no external scripts, fonts, analytics, telemetry, or runtime libraries.

## Build

```powershell
.\build-standalone.ps1
```

or:

```bat
build-standalone.bat
```

Repository validation:

```powershell
.\scripts\check-repository.ps1
```

Artifacts:

- `dist/index.html`
- `dist/index.self-extract.html`
- `dist/dependency-manifest.json`
- `dist/self-extract-manifest.json`

## GitHub Pages

The Pages workflow runs on pushes to `main`. For a new repository, set **Settings → Pages → Source** to **GitHub Actions** once. If Pages has not been enabled yet, the workflow still builds the standalone artifacts and safely skips deployment.

## Template

This repository follows the structure and principles of [ttomohisa/htmlapps-template](https://github.com/ttomohisa/htmlapps-template): self-contained HTML, local-first behavior, bilingual light-only UI, and mobile-first responsiveness.

## License

MIT License
