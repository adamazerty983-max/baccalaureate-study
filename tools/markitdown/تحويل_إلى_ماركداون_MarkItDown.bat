@echo off
chcp 65001 >nul
title أداة تحويل الملفات إلى Markdown (Microsoft MarkItDown)
cls

if "%~1"=="" (
    echo ====================================================================
    echo    📄 أداة تحويل الملفات إلى Markdown (MarkItDown - Microsoft)
    echo ====================================================================
    echo.
    echo  [!] لم تقم بسحب أي ملف!
    echo.
    echo  💡 طريقة الاستخدام السهلة:
    echo     اسحب أي ملف (PDF, Excel, Word, PPTX...) وأفلته فوق هذا الملف (.bat)
    echo     وسيتم تحويله تلقائياً وبسرعة إلى ملف .md في نفس المجلد!
    echo.
    echo ====================================================================
    echo  أو أدخل مسار الملف يدوياً هنا:
    set /p input_file="مسار الملف: "
) else (
    set "input_file=%~1"
)

if not exist "%input_file%" (
    echo.
    echo [X] الملف غير موجود! يرجى التأكد من المسار.
    pause
    exit /b
)

:: Get file directory, name without extension
for %%F in ("%input_file%") do (
    set "file_dir=%%~dpF"
    set "file_name=%%~nF"
)

set "output_file=%file_dir%%file_name%.md"

echo.
echo ⏳ جاري تحويل الملف: "%file_name%" ...
markitdown "%input_file%" -o "%output_file%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ تم التحويل بنجاح! 🎉
    echo 📁 الملف الناتج: "%output_file%"
) else (
    echo.
    echo ⚠️ حدث خطأ أثناء التحويل. تأكد من أن الملف سليم وغير تالف.
)

echo.
pause

