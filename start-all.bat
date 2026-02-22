@echo off
REM Start Vantage AI-Service and Frontend with one command

echo.
echo ========================================
echo   Starting Vantage AI-Service & Frontend
echo ========================================
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Start AI Service in a new window
echo Starting AI Service on port 8000...
start cmd /k "cd /d "%SCRIPT_DIR%ai-service" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait a moment for AI service to start
timeout /t 3 /nobreak

REM Start Frontend in a new window
echo Starting Frontend on port 3000...
start cmd /k "cd /d "%SCRIPT_DIR%Vantiage frontend" && npm run dev"

echo.
echo ========================================
echo   Services Starting...
echo ========================================
echo.
echo AI Service:  http://localhost:8000
echo Frontend:    http://localhost:3000
echo.
echo Close either terminal window to stop the service.
echo.
