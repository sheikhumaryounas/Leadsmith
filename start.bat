@echo off
echo ====================================================
echo Starting Leadsmith Backend (Port 4000)...
echo ====================================================
start "Leadsmith API Server (Port 4000)" cmd /k "cd /d %~dp0server && npm run dev"

echo.
echo ====================================================
echo Starting Leadsmith Frontend (Port 5173)...
echo ====================================================
cd /d "%~dp0"
npm run dev

