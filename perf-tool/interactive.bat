@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0interactive.ps1" %*
echo.
pause
