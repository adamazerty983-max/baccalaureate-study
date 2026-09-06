@echo off
chcp 65001 >nul
title منصة التحضير للامتحان الوطني للبكالوريا - تشغيل محلي بدون إنترنت
cls
echo ====================================================================
echo    🎓 منصة التحضير للامتحان الوطني للبكالوريا (2ème BAC)
echo    ⚡ جاري تشغيل الموقع محلياً بدون إنترنت...
echo ====================================================================
echo.

cd /d "%~dp0"

:: Start Vite dev server locally in the background
start /b cmd /c "npm.cmd run dev"

:: Wait 2 seconds for the server to spin up
timeout /t 3 /nobreak >nul

:: Open in default web browser
start http://localhost:3000
start http://localhost:3001

echo.
echo  ✅ تم إطلاق السيرفر وفتح الموقع في متصفحك بنجاح!
echo  🌐 الرابط: http://localhost:3000 أو http://localhost:3001
echo.
echo  💡 الموقع يعمل محلياً بنسبة 100%% دون الحاجة لأي اتصال بالإنترنت.
echo  📌 يمكنك حفظ الرابط في المفضلة (Bookmarks) للوصول السريع.
echo  ⚠️ اترك هذه النافذة مفتوحة طوال فترة استخدامك للموقع.
echo.
echo اضغط أي زر لإيقاف التشغيل والخروج...
pause >nul

