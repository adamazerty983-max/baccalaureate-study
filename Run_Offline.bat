@echo off
title Baccalaureate Study Hub - Offline Launcher
cls
echo ====================================================================
echo    National Baccalaureat Exam Study Hub
echo    Starting local offline server...
echo ====================================================================
echo.

cd /d "%~dp0"
start /b cmd /c "npm.cmd run dev"
timeout /t 3 /nobreak >nul
start http://localhost:3000
start http://localhost:3001

echo Server started at http://localhost:3000 or http://localhost:3001
echo You can use the app completely offline.
echo Keep this window open while studying.
echo.
pause

