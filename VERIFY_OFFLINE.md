# Offline verification

1. Run `build-standalone.bat` on Windows.
2. Disconnect the network.
3. Open `dist/index.html` directly.
4. Start, pause, resume, add five minutes, finish a session, reload, and confirm state restoration.
5. Confirm Japanese/English switching, filtered CSV export, and export of all app data as JSON. JSON import is not supported.
6. Check the export menu opens, closes on an outside click or Escape, and stays inside a narrow phone viewport.
7. PiP and notification availability depend on browser/OS security requirements; lack of PiP must not affect the normal timer.
8. Check that the initial HTML load is the only necessary network request on a hosted page, and that local standalone operation needs none.

The generated CSP includes `connect-src 'none'` and the verifier rejects external runtime asset URLs.
