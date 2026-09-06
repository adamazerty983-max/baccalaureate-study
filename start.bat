@echo off
title Baccalaureate Study Hub - Execution Server
echo ===================================================
echo   Baccalaureate Study Hub - Starting Local Server
echo ===================================================

if not exist "node_modules\" (
    echo [INFO] First run detected. Installing dependencies...
    call npm.cmd install
)

echo [INFO] Launching Vite development server on http://localhost:3000...
start http://localhost:3000
call npm.cmd run dev
pause

