@echo off
title Baccalaureate Study Hub - Application Launcher
cls
echo ====================================================================
echo    Baccalaureate Study Hub - Desktop Application
echo ====================================================================
echo.

cd /d "%~dp0"

:: 1. Prioritize standalone unpacked Electron executable (Zero Node.js/npm required)
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

:: 3. Fallback: launch using local Electron runner if in dev environment
if exist "node_modules\electron\dist\electron.exe" (
    echo Starting desktop application via Electron...
    start "" "node_modules\electron\dist\electron.exe" .
    exit /b 0
)

:: 4. Fallback: Offer web dev server or build command
echo [INFO] Packaged desktop executable not found.
echo.
echo Options:
echo   1. To build the desktop executable, run: npm run electron:build:win
echo   2. Starting local web development server...
echo.
call npm.cmd run dev
pause
