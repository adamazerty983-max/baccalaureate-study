@echo off
title Baccalaureate Study Hub - Desktop Offline Launcher
cls
echo ====================================================================
echo    Baccalaureate Study Hub - Standalone Desktop Application
echo ====================================================================
echo.

cd /d "%~dp0"

:: 1. Prioritize standalone unpacked executable (Zero Node.js/npm required)
if exist "release\win-unpacked\Baccalaureate Study Hub.exe" (
    echo Launching standalone desktop application...
    start "" "release\win-unpacked\Baccalaureate Study Hub.exe"
    exit /b 0
)

:: 2. Check for installed app in local user directory
if exist "%LOCALAPPDATA%\Programs\baccalaureate-study-hub\Baccalaureate Study Hub.exe" (
    echo Launching installed desktop application...
    start "" "%LOCALAPPDATA%\Programs\baccalaureate-study-hub\Baccalaureate Study Hub.exe"
    exit /b 0
)

:: 3. Fallback: launch using local Electron runner
if exist "node_modules\electron\dist\electron.exe" (
    echo Starting desktop application via Electron...
    start "" "node_modules\electron\dist\electron.exe" .
    exit /b 0
)

echo [ERROR] Packaged desktop app not found.
echo Please run: npm run electron:build:win
echo.
pause
