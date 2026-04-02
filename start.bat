@echo off
cd /d "%~dp0"

echo.
echo  CheckerActivity - server startup
echo  ================================

:: Kill any process already using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
  echo  Stopping previous process ^(PID %%a^)...
  taskkill /PID %%a /F >nul 2>&1
)

echo.
echo  Config file     : %~dp0config.json
echo  DB paths        : read from config.json
echo.
echo  Open in browser : http://localhost:3000
echo.
node server.js
pause
