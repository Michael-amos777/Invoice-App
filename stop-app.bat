@echo off
echo Stopping Invoicr Pro server...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo Invoicr Pro has been stopped.
pause
