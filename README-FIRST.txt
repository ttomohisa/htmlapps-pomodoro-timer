Pomodoro Timer repository

1. Update APP_SPEC.md, README.md, README.ja.md and CHANGELOG.md when behavior changes.
2. Edit src/index.template.html, not generated HTML under dist/.
3. Run build-standalone.bat on Windows to regenerate both standalone variants.
4. Run scripts\check-repository.ps1 before pushing (requires Node.js 24 for tests).
5. Keep generated dist files synchronized when they are committed.
6. Merging a bumped app.config.json version into main triggers validated Git tagging and GitHub Release creation.

The app is intentionally local-first, bilingual, light-only, and dependency-free.
