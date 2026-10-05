# Changelog

## Unreleased

- Add up to three local duration sets in Settings, with draft-only Apply, deduplication, and preset-only removal/Undo.
- Validate legacy duration-set data and keep the previous set list if browser storage fails, with a retryable error.
- Preserve idle +5 extensions across settings changes and reloads until reset, including legacy timer states.
- Replace Japanese 25-minute session/Flow copy with duration-neutral wording.
- Report session-only settings changes when browser storage fails without resetting active timers.
- Run duration-set, persistence-failure, and existing timer/history regression tests against all four HTML variants.

- Add dated, searchable Today / All history, safe intention reuse, and filtered CSV export.
- Preserve Flow overtime across repeated extensions, pauses, reloads, and delayed timer events.
- Prevent empty completions, held-key repeats, and timer shortcuts inside dialogs.
- Refresh Today after midnight and attribute natural completions to their deadline.
- Preserve newly paused sessions when changing settings and keep video PiP labels aligned.
- Add dependency-free regression tests for source and every generated HTML variant.

## 1.0.0 - 2026-08-16

- Initial release.
- Added timestamp-based Pomodoro timer with configurable focus and break lengths.
- Added interactive Document Picture-in-Picture with Video PiP fallback.
- Added one-line session intention, distraction counter with undo, and Flow overtime.
- Added local history, today summary, notification/sound options, JSON export, and bilingual UI.
- Added mobile control dock and responsive app-like layout.
