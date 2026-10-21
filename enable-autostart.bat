@echo off
setlocal
set "SCRIPT_PATH=%~dp0start-silent.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\InvoicrPro.lnk"

echo Setting up Invoicr Pro to start automatically with Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%SCRIPT_PATH%'; $s.WorkingDirectory = '%~dp0'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [SUCCESS] Invoicr Pro will now start silently when your laptop turns on!
    echo Your installed app will now work anytime you click its icon.
) else (
    echo [ERROR] Could not create shortcut. You can manually copy start-silent.vbs to shell:startup.
)
echo.
pause
