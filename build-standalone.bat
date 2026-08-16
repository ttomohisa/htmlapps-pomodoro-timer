@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-standalone.ps1" %*
exit /b %ERRORLEVEL%
