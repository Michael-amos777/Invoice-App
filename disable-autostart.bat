@echo off
set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\InvoicrPro.lnk"

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%"
    echo [SUCCESS] Removed Invoicr Pro from Windows startup.
) else (
    echo Invoicr Pro was not set to auto-start.
)
echo.
pause
