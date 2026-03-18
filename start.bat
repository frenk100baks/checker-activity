@echo off
cd /d "%~dp0"

echo.
echo  CheckerActivity — запуск сервера
echo  ================================

:: Kill any process already using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
  echo  Зупиняємо старий процес ^(PID %%a^)...
  taskkill /PID %%a /F >nul 2>&1
)

echo.
echo  Konnex DB : %~dp0Konnex\konnex.db.json
echo  Canopy DB : %~dp0Canopy\canopy.db.json
echo.
echo  Відкрийте браузер: http://localhost:3000
echo.
node server.js
pause
