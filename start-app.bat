@echo off
title Invoicr Pro
cd /d "%~dp0"
echo ==============================================
echo   Starting Invoicr Pro...
echo ==============================================
echo Opening browser at http://localhost:5000
start "" http://localhost:5000
node server/src/index.js
