# Offline verification

1. Run `build-standalone.bat` on Windows.
2. Disconnect the network.
3. Open `dist/index.html` directly.
4. Start, pause, resume, add five minutes, finish a session, reload, and confirm state restoration.
5. Confirm language switching and JSON export work.
6. PiP may depend on browser/OS security requirements; lack of PiP must not affect the normal timer.

The generated CSP includes `connect-src 'none'` and the verifier rejects external runtime asset URLs.
